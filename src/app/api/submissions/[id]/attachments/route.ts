import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedSubmission } from "@/lib/ownership";
import cloudinary from "@/lib/cloudinary";

// Vercel's Serverless Functions cap request bodies at ~4.5MB regardless of plan —
// keeping this under that avoids a confusing 413 after you deploy.
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "INTERN") return forbidden();

  const { id: submissionId } = await params;

  const submission = await getOwnedSubmission(submissionId, user);
 
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.assignment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This task is already completed — attachments can no longer be added" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large — max 4MB" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, images, ZIP, Word documents, plain text." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  let uploadResult;
  try {
    uploadResult = await cloudinary.uploader.upload(dataUri, {
      resource_type: "auto",
      folder: "intern-management/submissions",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload file to storage. Please try again." },
      { status: 502 }
    );
  }

  const attachment = await prisma.attachment.create({
    data: {
      submissionId,
      fileName: file.name,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileType: file.type,
      fileSize: file.size,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  

  const submission = await getOwnedSubmission(submissionId, user);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { submissionId },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(attachments);
}