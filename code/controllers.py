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

from py4web import action, request, abort, redirect, URL, Field
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from py4web.utils.auth import Auth
from .models import get_user_email, get_name
import uuid 
import random 
import time

url_signer = URLSigner(session)

@action('index')
@action.uses(auth, url_signer, 'index.html')
def index():
    show_delete = db.auth_user.email == get_user_email()
    # print(db.auth_user.small_business)
    # print(auth.extra_fields)
    return dict(
        # This is the signed URL for the callback.
        email=get_user_email(),
        name=get_name(),
        show_delete = show_delete,
        set_likes_url = URL('set_likes', signer=url_signer),
        get_likes_url = URL('get_likes', signer=url_signer),
        get_likes_stream_url = URL('get_likes_stream', signer=url_signer),
        load_posts_url = URL('load_posts', signer=url_signer),
        add_post_url = URL('add_post', signer=url_signer),
        delete_post_url = URL('delete_post', signer=url_signer),
        search_url = URL('search', signer=url_signer),
        upload_thumbnail_url = URL('upload_thumbnail', signer=url_signer),
        add_comment_url = URL('add_comment', signer=url_signer),
        get_comments_stream_url = URL('get_comments_stream', signer=url_signer),
        delete_comment_url = URL('delete_comment', signer=url_signer),
    )

# This is our very first API function.
@action('load_posts')
@action.uses(auth, url_signer.verify(), db)
def load_posts():
    rows = db(db.posts).select().as_list()
    return dict(
        rows= rows,)

@action('add_post', method='POST')
@action.uses(auth, url_signer.verify(), db)
def add_post():
    name = get_name()
    email = get_user_email()
    if(request.json.get('title') != "" and request.json.get('content') != "" 
    and request.json.get('location') != "" and request.json.get('business_name') != "" 
    and request.json.get('category') != ""):
        id = db.posts.insert(
            title=request.json.get('title'),
            content=request.json.get('content'),
            location=request.json.get('location'),
            category=request.json.get('category'),
            business_name=request.json.get('business_name'),
            name=name,
            email = email,
        )
        return dict(
            id=id,
            name=name,
            email=email,
        )
    else:
        print("You must fill all the fields to post!")
        id = request.params.get('id')
        assert id is not None
        db(db.posts.id == id).delete()
        return "failed to post"

@action('delete_post')
@action.uses(auth, url_signer.verify(), db)
def delete_post():
    id = request.params.get('id')
    assert id is not None
    db(db.posts.id == id).delete()
    return "ok"

@action('delete_comment')
@action.uses(auth, url_signer.verify(), db)
def delete_comment():
    post_id = request.params.get('post_id')
    c_idx = request.params.get('c_idx')
    assert post_id is not None
    assert c_idx is not None
    db(
        (db.comments.post_id == post_id) &
        (db.comments.id == c_idx)
      ).delete()
    return "ok"

@action('add_comment', method='POST')
@action.uses(auth, url_signer.verify(), db)
def add_comment():
    post_id = request.json.get('post_id')
    commenter = request.json.get('commenter')
    t_comment = request.json.get('comment')
    assert post_id is not None and t_comment is not None
    comment_content = commenter + ": " + t_comment
    email = get_user_email()
    db.comments.insert(
        post_id = post_id,
        commenter = commenter,
        comment_content = comment_content,
        email = email,
    )
    rows = db(
                (db.comments.post_id == post_id)
    ).select().as_list()
    return dict(
        rows=rows,
        email = email,
    )

@action('get_likes')
@action.uses(url_signer.verify(), db)
def get_likes():
    post_id = request.params.get('post_id')
    likee = request.params.get('likee')
    row = db(
                (db.likes.post_id == post_id) &
                (db.likes.likee == likee)
            ).select().first()
    like_type = row.like_type if row is not None else 0
    return dict(
        like_type=like_type
    )

@action('set_likes', method='POST')
@action.uses(url_signer.verify(), db)
def set_likes():
    post_id = request.json.get('post_id')
    like_type = request.json.get('like_type')
    likee = request.json.get('likee')
    assert post_id is not None and like_type is not None
    db.likes.update_or_insert(
        (
            (db.likes.post_id == post_id) &
            (db.likes.likee == likee)
        ),
        like_type=like_type,
        likee=likee,
        post_id=post_id,
    )
    return "yeet"

@action('get_likes_stream')
@action.uses(url_signer.verify(), db)
def get_likes_stream():
    post_id = request.params.get('post_id')
    likee = request.params.get('likee')
    rows = db(
                (db.likes.post_id == post_id) &
                (db.likes.likee != likee)
             ).select().as_list()
    number_of_likes = 0
    number_of_dislikes = 0
    likes = []
    string_of_dislikes = ""
    i = 0
    for r in rows:
        if(r['like_type'] == 1):
            likes.append(r['likee'])
            number_of_likes += 1
        elif(r['like_type'] == 2):
            string_of_dislikes += r['likee'] + ", "
            number_of_dislikes += 1
    return dict(
        number_of_likes=number_of_likes,
        number_of_dislikes=number_of_dislikes,
        likes=likes,
        string_of_dislikes=string_of_dislikes,
    )

@action('get_comments_stream')
@action.uses(url_signer.verify(), db)
def get_comments_stream():
    post_id = request.params.get('post_id')
    commenter = request.params.get('commenter')
    rows = db(
                (db.comments.post_id == post_id) &
                (db.comments.commenter != commenter)
            ).select().as_list()
    number_of_comments = 0
    comments = []
    i = 0
    for r in rows:
        comments.append(r)
    return dict(
        number_of_comments = number_of_comments,
        comments = [ele for ele in reversed(comments)],
    )

# This controller is used to go to the explore map page
@action('explore')
@action.uses(db, auth, url_signer, 'explore.html')
def explore():
    rows = db(db.posts).select(db.posts.location).as_list()
    businessnames = db(db.posts).select(db.posts.business_name).as_list()

    locations = ""
    googlemaps = []
    bizznames = []
    business_names = ""

    final_dict = {}
    for row in rows:
        for k in row:
            locations += row.get(k) + "!"
            googlemaps.append(row.get(k))

    for r in businessnames:
        for i in r:
            # print(r.get(i))
            bizznames.append(r.get(i))
            business_names += r.get(i) + "!"
    
    for name, maps in zip(bizznames, googlemaps):
        # print(name, maps)
        final_dict[name] = maps

    # print(final_dict)

    
    return dict(
        # This is the signed URL for the callback.
        email=get_user_email(),
        businessnames=businessnames,
        business_names=business_names,
        final_dict=final_dict,
        bizznames=bizznames,
        googlemaps=googlemaps,
        name=get_name(),
        locations=locations,
        rows=rows,
    )

# This controller is used to initialize the database.
@action('profile')
@action.uses(auth.user, url_signer, 'profile.html')
def profile():
    show_delete = db.auth_user.email == get_user_email()

    return dict(
        # This is the signed URL for the callback.
        email=get_user_email(),
        name=get_name(),
        show_delete = show_delete,
        set_likes_url = URL('set_likes', signer=url_signer),
        get_likes_url = URL('get_likes', signer=url_signer),
        get_likes_stream_url = URL('get_likes_stream', signer=url_signer),
        load_posts_url = URL('load_posts', signer=url_signer),
        add_post_url = URL('add_post', signer=url_signer),
        delete_post_url = URL('delete_post', signer=url_signer),
        search_url = URL('search', signer=url_signer),
        upload_thumbnail_url = URL('upload_thumbnail', signer=url_signer),
        add_comment_url = URL('add_comment', signer=url_signer),
        get_comments_stream_url = URL('get_comments_stream', signer=url_signer),
        delete_comment_url = URL('delete_comment', signer=url_signer),

    ) 


# About Bizzit page
@action('about')
@action.uses(auth, url_signer, 'about.html')
def about():
    return dict(
        # This is the signed URL for the callback.
        email=get_user_email(),
        name=get_name(),
    ) 

@action('search')
@action.uses(db, url_signer.verify())
def search():
    t = request.params.get('q')
    if t:
        tt = t.strip()
        
        q = ((db.posts.name.contains(tt)) | (db.posts.content.contains(tt)) | 
        (db.posts.title.contains(tt)) | (db.posts.location.contains(tt)) | 
        (db.posts.business_name.contains(tt)) | (db.posts.category.contains(tt)))
        
    else: 
        q = db.posts.id > 0

    rows = db(q).select().as_list()
    return dict(rows=rows)
    


@action('upload_thumbnail', method="POST")
@action.uses(auth, url_signer.verify(), db)
def upload_thumbnail():
    post_id = request.json.get("post_id")
    thumbnail = request.json.get("thumbnail")
    db(db.posts.id == post_id).update(thumbnail=thumbnail)
    redirect(URL('index'))
    return "ok"