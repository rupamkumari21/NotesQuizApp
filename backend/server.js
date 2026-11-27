const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// ======================================================
// UPLOADS FOLDER
// ======================================================

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// ======================================================
// MULTER SETUP
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    filename: (req, file, cb) => {

        const originalName = file.originalname;

        const extension = path.extname(originalName);

        const baseName = path
            .basename(originalName, extension)
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        const newName =
            Date.now() + "-" + baseName + extension;

        cb(null, newName);
    }

});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

// ======================================================
// DOWNLOAD PDF
// ======================================================

app.get("/api/download", (req, res) => {

    try {

        const text = req.query.text || "No Data";

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="notes.pdf"'
        );

        doc.pipe(res);

        doc.fontSize(14);

        doc.text(text);

        doc.end();

    } catch (err) {

        console.error("Download Error:", err);

        res.status(500).json({
            message: "Could not create PDF"
        });

    }

});

// ======================================================
// UPLOAD DOCUMENT
// ======================================================

app.post(
    "/api/upload",
    upload.single("notes"),
    async (req, res) => {

        try {

            // ------------------------------------------------
            // CHECK FILE
            // ------------------------------------------------

            if (!req.file) {

                return res.status(400).json({
                    message: "Please upload a document."
                });

            }

            const filePath = req.file.path;

            const originalFileName =
                req.file.originalname;

            const fileSize =
                req.file.size;

            const fileExtension =
                path
                    .extname(originalFileName)
                    .toLowerCase();

            console.log("--------------------------------");
            console.log("File name:", originalFileName);
            console.log("File size:", fileSize);
            console.log("File type:", fileExtension);
            console.log("--------------------------------");


            // ------------------------------------------------
            // SUPPORTED FILE TYPES
            // ------------------------------------------------

            const supportedExtensions = [
                ".pdf",
                ".docx",
                ".txt"
            ];

            if (
                !supportedExtensions.includes(
                    fileExtension
                )
            ) {

                // Delete unsupported file
                try {
                    await fs.promises.unlink(filePath);
                } catch (e) {}

                return res.status(400).json({

                    message:
                        "Unsupported file type.",

                    supported:
                        "PDF, DOCX and TXT files are supported."

                });

            }


            // ------------------------------------------------
            // TEXT EXTRACTION
            // ------------------------------------------------

            let text = "";


            // =================================================
            // PDF
            // =================================================

            if (fileExtension === ".pdf") {

                console.log("Processing PDF...");

                const pdfBuffer =
                    await fs.promises.readFile(
                        filePath
                    );

                if (
                    !pdfBuffer ||
                    pdfBuffer.length === 0
                ) {

                    return res.status(400).json({
                        message:
                            "Uploaded PDF is empty."
                    });

                }

                try {

                    const pdfData =
                        await pdfParse(pdfBuffer);

                    text =
                        pdfData.text || "";

                } catch (pdfError) {

                    console.error(
                        "PDF Parse Error:",
                        pdfError
                    );

                    return res.status(400).json({
                        message:
                            "Could not read this PDF. The PDF may be corrupted, scanned, or unsupported."
                    });

                }

            }


            // =================================================
            // DOCX
            // =================================================

            else if (fileExtension === ".docx") {

                console.log("Processing DOCX...");

                try {

                    const result =
                        await mammoth.extractRawText({
                            path: filePath
                        });

                    text =
                        result.value || "";

                } catch (docxError) {

                    console.error(
                        "DOCX Error:",
                        docxError
                    );

                    return res.status(400).json({
                        message:
                            "Could not read this DOCX file."
                    });

                }

            }


            // =================================================
            // TXT
            // =================================================

            else if (fileExtension === ".txt") {

                console.log("Processing TXT...");

                try {

                    text =
                        await fs.promises.readFile(
                            filePath,
                            "utf8"
                        );

                } catch (txtError) {

                    console.error(
                        "TXT Error:",
                        txtError
                    );

                    return res.status(400).json({
                        message:
                            "Could not read this TXT file."
                    });

                }

            }


            // ------------------------------------------------
            // CHECK EXTRACTED TEXT
            // ------------------------------------------------

            console.log(
                "Extracted text length:",
                text.length
            );

            if (
                !text ||
                text.trim().length === 0
            ) {

                return res.status(400).json({

                    message:
                        "No readable text was found in this document."

                });

            }


            // ------------------------------------------------
            // CLEAN TEXT
            // ------------------------------------------------

            const clean =
                text
                    .replace(/\s+/g, " ")
                    .trim();


            // ------------------------------------------------
            // CREATE SENTENCES
            // ------------------------------------------------

            const sentences =
                clean
                    .split(/[.!?]+/)
                    .map(
                        (sentence) =>
                            sentence.trim()
                    )
                    .filter(
                        (sentence) =>
                            sentence.length > 15
                    )
                    .slice(0, 18);


            // =================================================
            // SUMMARY
            // =================================================

            const intro =
                sentences
                    .slice(0, 5)
                    .map(
                        (sentence) =>
                            "• " + sentence
                    )
                    .join("\n");


            const main =
                sentences
                    .slice(5, 12)
                    .map(
                        (sentence) =>
                            "• " + sentence
                    )
                    .join("\n");


            const conclusion =
                sentences
                    .slice(12, 18)
                    .map(
                        (sentence) =>
                            "• " + sentence
                    )
                    .join("\n");


            const summary =

                `INTRODUCTION

${intro || "No introduction found."}


MAIN POINTS

${main || "No main points found."}


CONCLUSION

${conclusion || "No conclusion found."}`;


            // =================================================
            // QUIZ GENERATION
            // =================================================

            const words =
                clean
                    .split(/\s+/)
                    .filter(
                        (word) =>
                            word.length > 5
                    );


            const quiz = [];


            for (
                let i = 0;
                i < 10;
                i++
            ) {

                const word =
                    words[i] ||
                    "Computer";


                quiz.push({

                    question:
                        `What is related to "${word}"?`,

                    options: [
                        "Data",
                        "System",
                        "Network",
                        "Computer"
                    ],

                    answer: "Data"

                });

            }


            // =================================================
            // KEY POINTS
            // =================================================

            const keyPoints =
                sentences
                    .slice(0, 10)
                    .map(
                        (sentence) =>
                            "• " + sentence
                    );


            // =================================================
            // RESPONSE
            // =================================================

            const responseData = {

                message: "Success",

                fileName:
                    originalFileName,

                fileType:
                    fileExtension,

                fileSize:
                    fileSize,

                extractedTextLength:
                    clean.length,

                summary:
                    summary,

                quiz:
                    quiz,

                keyPoints:
                    keyPoints

            };


            console.log(
                "Document processed successfully."
            );


            // ------------------------------------------------
            // DELETE TEMPORARY UPLOADED FILE
            // ------------------------------------------------

            try {

                await fs.promises.unlink(
                    filePath
                );

            } catch (deleteError) {

                console.log(
                    "Could not delete temporary file:",
                    deleteError.message
                );

            }


            // ------------------------------------------------
            // SEND RESPONSE
            // ------------------------------------------------

            res.json(responseData);

        }


        // ====================================================
        // ERROR HANDLING
        // ====================================================

        catch (err) {

            console.error(
                "Server Error:",
                err
            );


            // Try deleting uploaded file
            if (
                req.file &&
                req.file.path
            ) {

                try {

                    await fs.promises.unlink(
                        req.file.path
                    );

                } catch (e) {}

            }


            res.status(500).json({

                message:
                    "Server Error",

                error:
                    err.message

            });

        }

    }
);


// ======================================================
// MULTER ERROR HANDLING
// ======================================================

app.use(
    (err, req, res, next) => {

        if (
            err instanceof multer.MulterError
        ) {

            if (
                err.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    message:
                        "File is too large. Maximum size is 20 MB."

                });

            }

            return res.status(400).json({

                message:
                    err.message

            });

        }


        next(err);

    }
);


// ======================================================
// SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

    }
);