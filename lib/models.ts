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
    email: String,
    mobileNumber: String,
    ref: String,
    ff6E: String,
    ffEK: String,
    ffEY: String,
    ffSQ: String,
    ffAI: String,
    ffQR: String,
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

// New: simple photo-only schema
const PhotoSchema = new Schema(
  {
    imageUrl: String,
    publicId: String,
  },
  { _id: false },
)

// Payment information schema
const PaymentSchema = new Schema(
  {
    paymentDone: { type: Boolean, required: true },
    amount: { type: Number, default: 0 },
    paymentId: String,
    transactionReference: String,
    bypassPasswordUsed: { type: Boolean, default: false },
  },
  { _id: false },
)

const DocumentSetSchema = new Schema(
  {
    passport_front: PassportFrontSchema,
    passport_back: PassportBackSchema,
    aadhar: AadharSchema,
    pan: PanSchema,
    // New: standalone traveler photo
    photo: PhotoSchema,
    // Payment information
    payment: PaymentSchema,
  },
  { timestamps: true },
)

export type DocumentSet = mongoose.InferSchemaType<typeof DocumentSetSchema>

export const DocumentSetModel =
  (models.DocumentSet as mongoose.Model<DocumentSet>) || model<DocumentSet>("DocumentSet", DocumentSetSchema)
