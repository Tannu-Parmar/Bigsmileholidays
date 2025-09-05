import type mongoose from "mongoose"
import { Schema, models, model } from "mongoose"

const PassportFrontSchema = new Schema(
  {
    passportNumber: String,
    firstName: String,
    lastName: String,
    nationality: String,
    sex: String,
    dateOfBirth: String,
    placeOfBirth: String,
    placeOfIssue: String,
    maritalStatus: String,
    dateOfIssue: String,
    dateOfExpiry: String,
    imageUrl: String,
  },
  { _id: false },
)

const PassportBackSchema = new Schema(
  {
    fatherName: String,
    motherName: String,
    spouseName: String,
    address: String,
    imageUrl: String,
  },
  { _id: false },
)

const AadharSchema = new Schema(
  {
    aadhaarNumber: String,
    name: String,
    dateOfBirth: String,
    gender: String,
    address: String,
    imageUrl: String,
  },
  { _id: false },
)

const PanSchema = new Schema(
  {
    panNumber: String,
    name: String,
    fatherName: String,
    dateOfBirth: String,
    imageUrl: String,
  },
  { _id: false },
)

const DocumentSetSchema = new Schema(
  {
    passport_front: PassportFrontSchema,
    passport_back: PassportBackSchema,
    aadhar: AadharSchema,
    pan: PanSchema,
  },
  { timestamps: true },
)

export type DocumentSet = mongoose.InferSchemaType<typeof DocumentSetSchema>
export const DocumentSetModel = models.DocumentSet || model("DocumentSet", DocumentSetSchema)
