import mongoose from "mongoose"

type GlobalWithMongoose = typeof globalThis & {
  _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }  
}
const g = global as GlobalWithMongoose

export async function dbConnect() {
  const uri = process.env.MONGODB_URI as string | undefined
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Configure it in your environment variables (e.g., Vercel Project Settings).",
    )
  }
  if (!g._mongoose) g._mongoose = { conn: null, promise: null }
  if (g._mongoose.conn) return g._mongoose.conn
  if (!g._mongoose.promise) g._mongoose.promise = mongoose.connect(uri, { bufferCommands: false })
  g._mongoose.conn = await g._mongoose.promise
  return g._mongoose.conn
}
