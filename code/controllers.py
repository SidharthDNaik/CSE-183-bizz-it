"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from .models import get_user_email, get_name

url_signer = URLSigner(session)

@action('index')
@action.uses(auth, url_signer, 'index.html')
def index():
    show_delete = db.auth_user.email == get_user_email()
    return dict(
        # This is the signed URL for the callback.
        email=get_user_email(),
        name=get_name(),
        show_delete = show_delete,
        thumbs_up_url = URL('thumbs_up', signer=url_signer),
        thumbs_down_url = URL('thumbs_down', signer=url_signer),
        load_posts_url = URL('load_posts', signer=url_signer),
        add_post_url = URL('add_post', signer=url_signer),
        delete_post_url = URL('delete_post', signer=url_signer),
    )

# This is our very first API function.
@action('load_posts')
@action.uses(auth, url_signer.verify(), db)
def load_posts():
    rows = db(db.post).select().as_list()
    return dict(
        rows= rows,
        )

@action('add_post', method='POST')
@action.uses(auth, url_signer.verify(), db)
def add_post():
    name = get_name()
    email = get_user_email()
    id = db.post.insert(
        content=request.json.get('content'),
        name=name,
        email = email,
    )
    return dict(
        id=id,
        name=name,
        email=email,
    )

@action('delete_post')
@action.uses(auth, url_signer.verify(), db)
def delete_post():
    id = request.params.get('id')
    assert id is not None
    db(db.post.id == id).delete()
    return "ok"

@action('get_likes')
@action.uses(url_signer.verify(), db, auth.user)
def get_likes():
    post_id = request.params.get('post_id')
    row = db(
                (db.likes.post == post_id) &
                (db.likes.liker == get_user())
            ).select().first()
    likes = row.likes if row is not None else 0
    return dict(
        likes=likes
    )

@action('set_likes', method='POST')
@action.uses(url_signer.verify(), db, auth.user)
def set_likes():
    post_id = request.json.get('post_id')
    likers = requests.json.get('likers')
    assert post_id is not None and likes is not None
    db.likes.update_or_insert(
        ((db.likes.post == post_id) &
         (db.stars.rater == get_user())
        ),
        post=post_id,
        liker=get_user()
    )
