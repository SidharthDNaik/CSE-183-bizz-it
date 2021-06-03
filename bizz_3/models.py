"""
This file defines the database models
"""

import datetime
from .common import db, Field, auth
from pydal.validators import *


def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_user_first_name():
    return auth.current_user.get('first_name') if auth.current_user else None

def get_user_last_name():
    return auth.current_user.get('last_name') if auth.current_user else None

def get_name():
    if get_user_last_name() and get_user_first_name():
        return get_user_first_name() + " " + get_user_last_name()
    return None

def get_time():
    return datetime.datetime.utcnow()


### Define your table below
#
# db.define_table('thing', Field('name'))
#
## always commit your models to avoid problems later

db.define_table('posts',
                    Field(
                        'name',
                        'string',
                        default = get_name,
                    ),
                    Field(
                        'content',
                        'string',
                    ),
                    Field(
                        'email',
                        'string',
                        default = get_user_email,
                    ),
                    Field(
                        'thumbnail','text'
                    ),
                    Field(
                        'image', 'text'
                    )
               )

db.define_table('likes',
                Field('post_id', 'reference posts'),
                Field('like_type', 'integer', default=0),
                Field('likee'),
)

db.commit()

