const express = require("express");
const router = express.Router();

router.get("/create/s3/media", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    const path = require("path");
    const fs = require("fs");
    const mediaPath = "data/media";
    const jsonPath = "data/json";
    //joining path of directory
    const directoryPath = path.join(__dirname, mediaPath);
    const jsonDirectoryPath = path.join(__dirname, jsonPath);
    const dotenv = require("dotenv");
    dotenv.config();
    var files = [];
    const promises = [];
    fs.readdirSync(directoryPath).forEach((file) => {
        files.push(file);
    });

    if (files.length == 0) {
        res.status(404).json("No media found to process");
        return;
    }
    for (i = 0; i < files.length; i++) {
        promises.push(getMetaData(directoryPath, files[i]));
    }
    const media = [];
    const outputCode = 1;
    Promise.all(promises)
        .then((results) => {
            for (j = 0; j < results.length; j++) {
                media.push(results[j]);
            }
            const jsonString = JSON.stringify(media);
            // write json data to file system
            fs.writeFile(
                jsonDirectoryPath + "/" + process.env.AWS_S3_MUSIFY_JSON_FILE,
                jsonString,
                (err) => {
                    if (err) {
                        outputCode = 0;
                        console.log("Error writing file", err);
                        res.status(500).json("Error writing file" + e);
                    } else {
                        // upload json data to aws s3
                        console.log(
                            "Successfully wrote musify data for s3 consumption to " +
                            jsonDirectoryPath +
                            "/" +
                            process.env.AWS_S3_MUSIFY_JSON_FILE
                        );

                        uploadJSONToAWS_S3(
                            path.join(jsonDirectoryPath, process.env.AWS_S3_MUSIFY_JSON_FILE)
                        );
                        res.status(201).json({
                            msg: "Successfully wrote musify data to AWS s3 bucket " +
                                process.env.AWS_S3_BUCKET_NAME +
                                " from " +
                                jsonDirectoryPath +
                                "/" +
                                process.env.AWS_S3_MUSIFY_JSON_FILE,
                        });
                    }
                }
            );
        })
        .catch((e) => {
            media.push({
                _id: null,
                metaData: e.message,
                src: e,
                error: true,
                diagnostic: e,
            });
            res.json("msg", "Error writing file");
        });
});

router.get("/s3/media", (req, res, next) => {
    const aws = require("aws-sdk");
    const fs = require("fs");
    const dotenv = require("dotenv");
    dotenv.config();
    const s3 = new aws.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_KEY,
    });
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: "musify-data/s3-musify-data-set.json",
    };
    //Fetch or read data from aws s3
    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err);
            res.status(500).json("Could not read media");
        } else {
            res.status(200).json(JSON.parse(data.Body.toString()));
        }
    });
});

function getAutoID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function uploadMEDIAToAWS_S3(filenameWithPath, fname) {
    const aws = require("aws-sdk");
    const fs = require("fs");
    const dotenv = require("dotenv");
    dotenv.config();
    const s3 = new aws.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_KEY,
    });
    // Read content from the file
    const fileContent = fs.readFileSync(filenameWithPath);

    // Setting up S3 upload parameters
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: process.env.AWS_S3_MUSIFY_MEDIA_FILE_PATH + "/" + fname,
        Body: fileContent,
        ACL: "public-read",
    };
    return new Promise((resolve) => {
        // Uploading files to the bucket
        s3.upload(params, function(err, data) {
            if (err) {
                console.log(`Media failed to upload to S3`);
                resolve({
                    msg: `Media failed to upload to S3`,
                });
            } else {
                console.log(
                    `Media uploaded successfully to AWS S3. ${process.env.AWS_S3_BUCKET_NAME}-${data.Location}`
                );
                resolve({
                    msg: `Media uploaded successfully to AWS S3. ${process.env.AWS_S3_BUCKET_NAME}-${data.Location}`,
                });
            }
        });
    });
}

function uploadJSONToAWS_S3(filenameWithPath) {
    const aws = require("aws-sdk");
    const fs = require("fs");
    const dotenv = require("dotenv");
    dotenv.config();
    const s3 = new aws.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_KEY,
    });
    // Read content from the file
    const fileContent = fs.readFileSync(filenameWithPath);

    // Setting up S3 upload parameters
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: process.env.AWS_S3_MUSIFY_JSON_FILE_PATH +
            "/" +
            process.env.AWS_S3_MUSIFY_JSON_FILE,
        Body: fileContent,
        ACL: "public-read",
    };
    return new Promise((resolve) => {
        // Uploading files to the bucket
        s3.upload(params, function(err, data) {
            if (err) {
                console.log(`JSON failed to upload to S3`);
                resolve({
                    msg: `JSON failed to upload to S3`,
                });
            } else {
                console.log(
                    `JSON uploaded successfully to AWS S3. ${process.env.AWS_S3_BUCKET_NAME}-${data.Location}`
                );
                resolve({
                    msg: `JSON uploaded successfully to AWS S3. ${process.env.AWS_S3_BUCKET_NAME}-${data.Location}`,
                });
            }
        });
    });
}
//Get Metadata
function getMetaData(path, fName) {
    var ffmpeg = require("fluent-ffmpeg");
    const fpath = require("path");
    const dotenv = require("dotenv");
    dotenv.config();
    return new Promise((resolve) => {
        setTimeout(() => {
            ffmpeg.ffprobe(fpath.join(path, fName), function(err, data) {
                if (err) console.error("Error reading metadata", err);
                else {
                    const s3Filename = fName.replace(/\s+/g, "+");
                    //upload media to aws s3
                    uploadMEDIAToAWS_S3(fpath.join(path, fName), fName);
                    resolve({
                        _id: getAutoID(),
                        src: fName,
                        filepath: fpath.join(path, fName),
                        httpFilePathLocal: "http://localhost:3000/private/data/media/" + fName,
                        httpFilePathHerokuServer: "https://musify0908.herokuapp.com/private/data/media/" + fName,
                        s3Path: process.env.AWS_MUSIFY_REGION_URL + s3Filename,
                        title: data.title,
                        artist: data.artist,
                        metadata: data,
                    });
                }
            });
        }, 1000);
    });
}

module.exports = router;