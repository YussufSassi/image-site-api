import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { json } from "body-parser";
const shortid = require("shortid");
import fileUpload from "express-fileupload";
import Image from "./models/Images";
import { connect } from "mongoose";
const ExifImage = require("exif").ExifImage;
import fs from "fs";
const cors = require("cors");
dotenv.config();

connect("mongodb://127.0.0.1:27017/images");

const app: Express = express();
export const router = express.Router();
const port = process.env.PORT;

app.use("/api/v1", router);
app.use(json());
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);
app.use(cors());
app.options("*", cors());
app.get("/", (req: Request, res: Response) => {
  res.json({ image: "api" });
});

router.post(
  "/upload",
  fileUpload(),
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader("Referrer-Policy", "no-referrer");
    let id = shortid.generate();
    let file = req.files?.file as fileUpload.UploadedFile;
    if (!file) {
      res.status(400).json({ error: "No file" });
    } else if (file.mimetype.split("/")[0] !== "image") {
      res.status(400).json({ error: "Not an image" });
    } else if (file.size > 50 * 1024 * 1024) {
      res.status(400).json({ error: "Your file is too large" });
    } else {
      let farr = file.name.split(".");
      let extension = farr.slice(-1);
      fs.mkdirSync(`${process.env.SRC_ABSOLUTE_DIR}usrimgs/${id}`);
      file.mv(
        `${process.env.SRC_ABSOLUTE_DIR}usrimgs/${id}/${id}.${extension}`
      );
      let image = new Image({
        filename: `${id}.${extension}`,
        id: id,
        path: `${process.env.SRC_ABSOLUTE_DIR}usrimgs/${id}/${id}.${extension}`,
        size: file.size,
        uploadedAt: Date.now(),
        originalFileName: file.name,
      });
      res.json(id);

      image.save((err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  }
);

router.get("/image/:id", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let id = req.params.id;
  Image.findOne({ id: id }, (err: Error, img: any) => {
    if (err) {
      res.status(400).json({ error: "No image found" });
    } else if (!img) {
      res.status(400).json({ error: "No image found" });
    } else {
      res.json({
        id: img.id,
        filename: img.filename,
        size: img.size,
        originalFileName: img.originalFileName,
        uploadedAt: img.uploadedAt,
      });
    }
  });
});
router.get("/image/:id/raw", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let id = req.params.id;
  Image.findOne({ id: id }, (err: Error, img: any) => {
    if (err) {
      res.status(400).json({ error: "No image found" });
    } else if (!img) {
      res.status(400).json({ error: "No image found" });
    } else {
      if (fs.existsSync(img.path)) {
        res.sendFile(img.path);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    }
  });
});

router.get("/image/:id/download", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let id = req.params.id;
  Image.findOne({ id: id }, (err: Error, img: any) => {
    if (fs.existsSync(img.path)) {
      res.download(img.path, img.originalFileName);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });
});

router.get("/image/:id/metadata", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let id = req.params.id;
  Image.findOne({ id: id }, (err: Error, img: any) => {
    if (err) {
      res.status(400).json({ error: "No image found" });
    } else if (!img) {
      res.status(400).json({ error: "No image found" });
    } else {
      if (fs.existsSync(img.path)) {
        new ExifImage({ image: img.path }, function (
          error: Error,
          exifData: Object
        ) {
          if (error) {
            console.log("Error: " + error.message);
            res.status(400).json({
              error: "There was an error getting metadata for this image.",
            });
          } else {
            res.json(exifData);
          }
        });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    }
  });
});

router.get("/stats/daily", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  Image.aggregate(
    [
      {
        $group: {
          _id: { day: { $dayOfMonth: "$uploadedAt" } },
          count: { $sum: 1 },
        },
      },
    ],
    (err: any, data: Object) => {
      if (err) {
        res.status(400).json({ error: "No image found" });
      }
      res.json(data);
    }
  );
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
