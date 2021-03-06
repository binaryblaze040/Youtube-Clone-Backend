
const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const randomstring = require("randomstring");

const URL = "mongodb+srv://binaryblaze:1234@cluster0.bpdbx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const DB = "youtube";
 
const app = express();
app.use(express.json());
app.use(cors());


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'pratick00714@gmail.com',
      pass: process.env.PASS
    }
});


// check
app.get("/", async (req, res) => {
    res.send("Youtube backend is working!")
});

// get all users
app.get("/users", async (req, res) => {
    let connection = await mongodb.MongoClient.connect(URL);
    let db = connection.db(DB);
    let users = await db.collection("users").find().toArray();
    res.json(users);
});


// register user
app.post("/register", async (req, res) => {
    try {
        let salt = await bcrypt.genSalt(10);
        let hashPassword = await bcrypt.hash(req.body.password, salt);
        let newUser = {
            firstname : req.body.fname,
            lastname : req.body.lname,
            email : req.body.email,
            password : hashPassword
        };

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);
        
        let emailExists = await db.collection("users").find(
            {
                email : req.body.email
            }
        ).toArray();
        
        if(emailExists.length == 0)
        {
            await db.collection("users").insertOne(newUser);
            await connection.close();

            res.status(200).json({
                message : "User Created!"
            });
        }
        else
        {
            await connection.close();
            res.status(409).json({
                message : "Email already exists!"
            });
        }       

    } catch (error) {
        res.status(500).json({
            message : error
        });
    }
});


// user login
app.post("/login", async (req, res) => {
    
    try {
        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);
        
        let user = await db.collection("users").findOne(
            {
                email : req.body.email
            }
        );
        
        if(user)
        {
            let validPassword = await bcrypt.compare(req.body.password, user.password);
            
            if(validPassword)
            {
                await connection.close();
                res.status(200).json({
                    email : user.email,
                    name : user.firstname + " " + user.lastname
                });
            }
            else
            {
                await connection.close();
                res.status(401).json({
                    message : "Wrong Password!"
                });
            }
        }
        else
        {
            await connection.close();
            res.status(404).json({ message : "User not found!" });      
        }
    } catch (error) {
        res.status(500).json({
            message : error
        });
    }
});


// get all videos
app.get("/videos", async (req, res) => {
    let connection = await mongodb.MongoClient.connect(URL);
    let db = connection.db(DB);
    let users = await db.collection("videos").find().toArray();
    res.json(users);
});


// upload a video
app.post("/upload", async (req, res) => {
    try {
        let newVideo = {
            name : req.body.name,
            description : req.body.description,
            tags : req.body.tags.split(","),
            user : req.body.user,
            link : req.body.link,
            views : 0,
            comments : [],
            likes : 0,
            dislikes : 0,
            id : req.body.link.split("/").slice(-1)[0]
        };

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);
        
        await db.collection("videos").insertOne(newVideo);
        await connection.close();

        res.status(200).json({
            message : "Video Uploaded!"
        });      

    } catch (error) {
        res.status(500).json({
            message : error
        });
    }
});


// delete video
app.post("/delete", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").findOneAndDelete(
            {
                user : req.body.user,
                link : req.body.link
            }
        );

        await connection.close();

        res.status(200).json({
            message : "Deleted"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// edit video
app.post("/edit", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                user : req.body.user,
                link : req.body.link
            },
            {
                $set : {
                    name : req.body.name,
                    description : req.body.description,
                    tags : req.body.tags
                }
            }
        );

        await connection.close();
        
        res.status(200).json({
            message : "Edited"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// search video 
app.post("/search", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        let searchResults = await db.collection("videos").find(
            { 
                $or: [
                    {
                        name : {'$regex': req.body.query}
                    },
                    {
                        description : {'$regex': req.body.query}
                    },
                    {
                        tags : {'$regex': req.body.query}
                    },
                    {
                        user : {'$regex': req.body.query}
                    }
                ] 
            }
        ).toArray();

        await connection.close();

        res.status(200).json(searchResults);

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// video recommendations
app.post("/recommendations", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        let recommendedVideos = await db.collection("videos").find(
            {
                tags :  { $in: req.body.tags }
            }
        ).toArray();

        await connection.close();

        res.status(200).json(recommendedVideos);

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// channel
app.post("/channel", async (req, res) => {
    
    try {
        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);
        
        let videos = await db.collection("videos").find(
            {
                user : req.body.email
            }
        ).toArray();
        
        if(videos)
        {
            await connection.close();
            res.status(200).json(videos);
        }
        else
        {
            await connection.close();
            res.status(404).json({ message : "No Uploads!" });      
        }
    } catch (error) {
        res.status(500).json({
            message : error
        });
    }
});


// add comment 
app.post("/comment", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                link : req.body.url
            },
            {
                $push : {
                    comments : req.body.comment
                }
            }
        );

        await connection.close();

        res.status(200).json({
            message : "Comment Added"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// like
app.post("/like", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                link : req.body.url
            },
            {
                $inc: {
                    likes: 1
                }
            }
        );

        await connection.close();

        res.status(200).json({
            message : "liked"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// dislike
app.post("/dislike", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                link : req.body.url
            },
            {
                $inc: {
                    dislikes: 1
                }
            }
        );

        await connection.close();

        res.status(200).json({
            message : "Disliked"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// delete video
app.post("/deleteComment", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                link : req.body.url
            },
            {
                $pull: {
                    comments: req.body.comment
                }
            }
        );

        await connection.close();

        res.status(200).json({
            message : "Deleted"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});


// views
app.post("/views", async (req, res) => {
    try {

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);

        await db.collection("videos").updateOne(
            {
                link : req.body.url
            },
            {
                $inc: {
                    views: 1
                }
            }
        );

        await connection.close();

        res.status(200).json({
            message : "Views Incremented"
        });

    } catch (error){

        res.status(500).json({
            message : error
        });
    }
});

let otp = "";
// reset password mail
app.post("/resetpassword", async (req, res) => {

    otp = randomstring.generate(
        {
            length: 10,
            charset: 'alphabetic'
        }
    );

    let mailContent = "Please follow this link to reset your password https://optimistic-heisenberg-34fb0c.netlify.app/resetPassword/" + req.body.email + "/" + otp;

    const mailOptions = {
        from: 'pratick00714@gmail.com',
        to: req.body.email,
        subject: 'RESET PASSWORD from YOUTUBE-Clone',
        text: mailContent
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) 
            res.status(500).json({
                message : error
            });
        else
            res.status(200).json({
                message : 'Email sent: ' + info.response
            });
        
    });
});

// to validate the otp in frontend generated by above method
app.get("/otp", async (req, res) => {
    res.json({
        otp : otp
    })
});


// reset the password of perticular email
app.post("/resetpasswordrequest", async (req, res) => {
    try {
        let salt = await bcrypt.genSalt(10);
        let hashPassword = await bcrypt.hash(req.body.password, salt);

        let connection = await mongodb.MongoClient.connect(URL);
        let db = connection.db(DB);
        
        await db.collection("users").updateOne(
            {
                email : req.body.email
            },
            {
                $set : {
                    password : hashPassword
                }
            }
        );

        await connection.close();
        res.status(200).json({
            message : "Password reset successful"
        }); 

    } catch (error) {
        res.status(500).json({
            message : error
        });
    }
});



app.listen(process.env.PORT || 8080);