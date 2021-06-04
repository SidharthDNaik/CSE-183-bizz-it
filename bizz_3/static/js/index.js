// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        post_mode: false,
        name : "",
        add_content: "",
        email: "",
        is_matching: false,
        rows: [],
        test: "",
    };

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => {e._idx = k++;});
        return a;
    };

    app.likeable = (a) => {
        a.map((e) => {
            Vue.set(e, 'like_type', 0);
        });
        return a;
    };

    app.likes_stream = (a) => {
        a.map((e) => {
            Vue.set(e, 'hover', false);
            Vue.set(e, 'number_of_likes', 0);
            Vue.set(e, 'number_of_dislikes', 0);
            Vue.set(e, 'likes', []);
            Vue.set(e, 'string_of_dislikes', "");
        });
        return a;
    };

    app.commentable = (a) => {
        a.map((e) => {
            // The toggle to show the comments
            Vue.set(e, 'comments_a_viewable', false);
            // number of comments
            Vue.set(e, 'number_of_comments', 0);
            // This is the comment we want to add from
            // input
            Vue.set(e, 'comment', "");
            // This is the string of comments that will be displayed
            Vue.set(e, 'comments', []);
        });
        return a;
    };


    app.add_post = function () {
        axios.post(add_post_url,
            {
                content: app.vue.add_content,
            }).then(
                function (response){
                    app.vue.rows.push({
                        id: response.data.id,
                        content: app.vue.add_content,
                        name: response.data.name,
                        email: response.data.email,
                        number_of_likes: 0,
                        number_of_dislikes: 0,
                        likes: [],
                        string_of_dislikes: "",
                    });
                    app.enumerate(app.vue.rows);
                    app.reset_form();
                    app.set_post_status(false);
                });
    };

    app.add_comment = function (row_idx) {
        // To test lets print to see if we get the comment in the field
        // and index
        // increase comment count for this post
        app.vue.rows[row_idx].number_of_comments++;
        // get id and comment
        let id = app.vue.rows[row_idx].id;
        let comment = app.vue.rows[row_idx].comment;
        
        axios.post(
                    add_comment_url, 
                    {
                        post_id: id, 
                        comment: comment, 
                        commenter: user_name,
                    }
                ).then(
                    function (response){
                        let row = app.vue.rows[row_idx];
                        let rows = response.data.rows;
                        row.comments.unshift(rows[rows.length-1]);
                        Vue.set(row, 'email', response.data.email);
                        app.enumerate(app.vue.rows);
                        app.reset_comment(row_idx);
                    });
    }

    app.reset_comment = function (row_idx) {
        app.vue.rows[row_idx].comment = "";
    }

    app.reset_form = function () {
        app.vue.add_content = "";
        app.vue.name = "";
    };

    app.delete_comment = function(row_idx){
        let row = app.vue.rows[row_idx]
    }

    app.delete_post = function(row_idx) {
        //TODO;
        let id = app.vue.rows[row_idx].id;
        axios.get(delete_post_url, 
            
            {params: {id: id}}
            
            ).then(function (response){
            for(let i = 0; i < app.vue.rows.length; i++){
                if(app.vue.rows[i].id == id){
                    app.vue.rows.splice(i, 1);
                    app.enumerate(app.vue.rows);
                    break;
                }
            }
        });
    };

    app.set_post_status = function (new_status) {
        app.vue.post_mode = new_status;
    };

    app.set_likes = function(row_idx, like_type){
        let row = app.vue.rows[row_idx];
        if (row.like_type === like_type) {
            Vue.set(row, 'like_type', 0)
            if (like_type === 1) {
                Vue.set(row, 'number_of_likes', row.number_of_likes - 1)
            } else if (like_type === 2) {
                Vue.set(row, 'number_of_dislikes', row.number_of_dislikes - 1)
            }
        } else {
            if ((row.like_type === 1) & (like_type === 2)) {
                Vue.set(row, 'number_of_likes', row.number_of_likes - 1)
            } else if ((row.like_type === 2) & (like_type === 1)) {
                   Vue.set(row, 'number_of_dislikes', row.number_of_dislikes - 1)
            }
                Vue.set(row, 'like_type', like_type)
            if (like_type === 1) {
                Vue.set(row, 'number_of_likes', row.number_of_likes + 1)
            } else if (like_type === 2) {
                Vue.set(row, 'number_of_dislikes', row.number_of_dislikes + 1)
            }
        }
        console.log(row.number_of_dislikes);
        axios.post(set_likes_url, {post_id: row.id, 
                                   like_type: row.like_type, 
                                   likee: user_name});
        app.enumerate(app.vue.rows);
    };

    app.set_hover = function (row_idx, new_status) {
        let row = app.vue.rows[row_idx];
        Vue.set(row, 'hover', new_status);
    };

    app.toggle_comments = function (row_idx){
        let row = app.vue.rows[row_idx];
        Vue.set(row, 'comments_a_viewable', !row.comments_a_viewable);
    };

    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        add_post: app.add_post,
        set_post_status: app.set_post_status,
        delete_post: app.delete_post,
        set_hover: app.set_hover,
        set_likes: app.set_likes,
        toggle_comments: app.toggle_comments,
        add_comment: app.add_comment,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    // Generally, this will be a network call to the server to
    // load the data.
    // For the moment, we 'load' the data from a string.
    app.init = () => {
        axios.get(load_posts_url).then(
        function (response) {
            app.vue.rows = app.commentable(app.likes_stream(app.likeable(app.enumerate(response.data.rows))));
        }).then(
            () => {
                for(let row of app.vue.rows){
                    axios.get(get_likes_url, {params: {"post_id": row.id, "likee": user_name}})
                    .then((result) => {
                        row.like_type = result.data.like_type;
                        if(row.like_type === 1){
                            row.number_of_likes++;
                        } else if (row.like_type === 2){
                            row.number_of_dislikes++;
                        }
                    });
                }
            }).then(
                () =>{
                    for(let row of app.vue.rows) {
                        axios.get(get_likes_stream_url, {params: {
                            "post_id": row.id,
                            "likee": user_name,
                        }}).then((result) => {
                            row.number_of_likes += result.data.number_of_likes;
                            row.number_of_dislikes += result.data.number_of_dislikes;
                            row.likes = result.data.likes;
                            row.string_of_dislikes = result.data.string_of_dislikes;
                        });
                    }
                }).then(
                    () => {
                        for(let row of app.vue.rows) {
                            axios.get(get_comments_stream_url, 
                                {params: {
                                    "post_id": row.id,
                                }}).then(
                                    (result) => {
                                        row.number_of_comments += result.data.number_of_comments;
                                        row.comments = result.data.comments;
                                    });
                        }
                    });
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);