import { Schema, model, connect } from "mongoose";

interface image {
  id: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  path: string;
  originalFileName: string;
}

const imageSchema = new Schema<image>({
  id: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, required: true },
  path: { type: String, required: true },
  originalFileName: { type: String, required: true },
});

const Image = model<image>("Image", imageSchema);
export default Image;
