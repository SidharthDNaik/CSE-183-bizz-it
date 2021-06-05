// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        post_mode: false,
        search_mode: false,
        name : "",
        add_content: "",
        add_title: "",
        add_location: "",
        email: "",
        is_matching: false,
        post_search:"",
        posts_list: [], //not used right now, using rows instead 
        rows: [],
        selection_done: false,
        uploading: false,
        uploaded_file: "",
        uploaded: false,
        img_url: "",
        add_mode: false,
    };

    // This is the file selected for upload.
    app.file = null;

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => {e._idx = k++;});
        return a;
    };

     // This decorates the rows (e.g. that come from the server)
    // adding information on their state:
    // - clean: read-only, the value is saved on the server
    // - edit : the value is being edited
    // - pending : a save is pending.
    app.decorate = (a) => {
        a.map((e) => {e._state = {title: "clean", content: "clean", location: "clean"} ;});
        return a;
    }

    app.select_file = function (event) {
        // Reads the file.
        let input = event.target;
        app.file = input.files[0];
        if (app.file) {
            app.vue.selection_done = true;
            // We read the file.
            let reader = new FileReader();
            reader.addEventListener("load", function () {
                app.vue.img_url = reader.result;
            });
            reader.readAsDataURL(app.file);
        }
    };

    app.upload_complete = function (file_name, file_type) {
        app.vue.uploading = false;
        app.vue.uploaded = true;
    };

    app.start_edit = function (row_idx, fn) {
        let row = app.vue.rows[row_idx];
        app.vue.rows[row_idx]._state[fn] = "edit";
    };

    app.stop_edit = function (row_idx, fn) {
        let row = app.vue.rows[row_idx];
        if (row._state[fn] === "edit") {
            row._state[fn] = "pending";
            axios.post(edit_post_url,
                {
                    id: row.id,
                    field: fn,
                    value: row[fn], // row.first_name
                }).then(function (result) {
                row._state[fn] = "clean";
            });
        }
        // If I was not editing, there is nothing that needs saving.
    }

    app.upload_file = function (event, row_idx) {
        let input = event.target;
        let file = input.files[0];
        let row = app.vue.rows[row_idx];
        if (file) {
            let reader = new FileReader();
            reader.addEventListener("load", function () {
                // Sends the image to the server.
                axios.post(upload_thumbnail_url,
                    {
                        post_id: row.id,
                        thumbnail: reader.result,
                        
                    })
                    .then(function () {
                        // Sets the local preview.
                        // let row = app.vue.rows[row_idx];
                        row.thumbnail = reader.result;

                    });
            });
            reader.readAsDataURL(file);
        }

        row = app.vue.rows[row_idx];
        app.vue.rows = rows;
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
            Vue.set(e, 'comments_a_viewable', false);
        });
        return a;
    };

    app.add_post = function () {
        axios.post(add_post_url,
            {
                title: app.vue.add_title,
                content: app.vue.add_content,
                location: app.vue.add_location,
                thumbnail: app.vue.add_thumbnail,
            }).then(
                function (response){
                    app.vue.rows.push({
                        id: response.data.id,
                        title: app.vue.add_title,
                        content: app.vue.add_content,
                        location: app.vue.add_location,
                        thumbnail: app.vue.add_thumbnail,
                        name: response.data.name,
                        email: response.data.email,
                        number_of_likes: 0,
                        number_of_dislikes: 0,
                        likes: [],
                        string_of_dislikes: "",
                        _state: {title: "clean", content: "clean", location: "clean"},
                    });
                    app.enumerate(app.vue.rows);
                    app.reset_form();
                    
                    app.set_post_status(false);
                    app.set_add_status(false);
                });
    };

    app.reset_form = function () {
        app.vue.add_title = "";
        app.vue.add_content = "";
        app.vue.add_location = "";
        app.vue.name = "";
    };

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

    app.set_add_status = function (new_status) {
        app.vue.add_mode = new_status;
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

    app.search = function () {
       axios.get(search_url, {params: {q: app.vue.post_search}})
            .then(function (result){
                app.vue.rows = app.enumerate(result.data.rows);
            });
        app.vue.search_mode = true;
    };

    app.clear_search = function () {
        app.vue.post_search = "";
        app.search();
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
        set_add_status: app.set_add_status,
        delete_post: app.delete_post,
        set_hover: app.set_hover,
        set_likes: app.set_likes,
        toggle_comments: app.toggle_comments,
        do_search: app.search,
        search: app.search,
        clear_search: app.clear_search,
        select_file: app.select_file,
        upload_file: app.upload_file,
        start_edit: app.start_edit,
        stop_edit: app.stop_edit,
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
        axios.get(search_url).then(
        function (response) {
            app.vue.rows = app.decorate(app.commentable(app.likes_stream(app.likeable(app.enumerate(response.data.rows)))));
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
                });

            // app.vue.rows = rows;
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
