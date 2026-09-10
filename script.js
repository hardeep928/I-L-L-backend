


require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Admin = require("./models/Admin");
const User = require("./models/User");
const Application = require("./models/Application");

const adminAuth = require("./middleware/adminAuth");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
    ],
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);


// =====================================================
// WEBSITE REGISTRATION + MEDIA UPLOAD
// =====================================================

// =====================================================
// UPLOAD FOLDER
// =====================================================

const uploadDirectory = path.join(
  __dirname,
  "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({
  destination: function (
    req,
    file,
    callback
  ) {
    callback(
      null,
      uploadDirectory
    );
  },

  filename: function (
    req,
    file,
    callback
  ) {
    const extension =
      path.extname(
        file.originalname
      );

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    callback(
      null,
      uniqueName
    );
  },
});


// =====================================================
// FILE FILTER
// =====================================================

// =====================================================
// FILE FILTER
// Live camera / microphone files bhi allow honge
// =====================================================

const fileFilter = (req, file, callback) => {
  console.log("FILE RECEIVED:", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
  });

  const ext = path
    .extname(file.originalname || "")
    .toLowerCase();

  // PHOTO
  if (file.fieldname === "photos") {
    const validPhoto =
      file.mimetype?.startsWith("image/") ||
      [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (validPhoto) {
      return callback(null, true);
    }

    return callback(
      new Error("Invalid photo file"),
      false
    );
  }

  // VOICE
  if (file.fieldname === "voiceRecording") {
    const validVoice =
      file.mimetype?.startsWith("audio/") ||
      file.mimetype === "application/octet-stream" ||
      file.mimetype === "video/webm" ||
      [".webm", ".mp3", ".wav", ".m4a", ".ogg"].includes(ext);

    if (validVoice) {
      return callback(null, true);
    }

    return callback(
      new Error("Invalid voice recording file"),
      false
    );
  }

  // VIDEO
  if (file.fieldname === "videoRecording") {
    const validVideo =
      file.mimetype?.startsWith("video/") ||
      file.mimetype === "application/octet-stream" ||
      [".webm", ".mp4", ".mov", ".mkv"].includes(ext);

    if (validVideo) {
      return callback(null, true);
    }

    return callback(
      new Error("Invalid video recording file"),
      false
    );
  }

  callback(
    new Error("Unknown upload field"),
    false
  );
};


// =====================================================
// MULTER
// =====================================================

const upload = multer({
  storage,

  fileFilter,

  limits: {
    // Max 100 MB per file
    fileSize:
      100 * 1024 * 1024,
  },
});


// =====================================================
// MAKE UPLOAD FILES ACCESSIBLE
// =====================================================

app.use(
  "/uploads",
  express.static(
    uploadDirectory
  )
);

// =====================================================
// CREATE APPLICATION
// =====================================================

app.post(
  "/api/applications",

  upload.fields([
    {
      name: "photos",
      maxCount: 10,
    },

    {
      name: "voiceRecording",
      maxCount: 1,
    },

    {
      name: "videoRecording",
      maxCount: 1,
    },
  ]),

  async (req, res) => {
    try {
      console.log(
        "TEXT DATA:",
        req.body
      );

      console.log(
        "FILES:",
        req.files
      );


      // ==========================================
      // PHOTOS
      // ==========================================

      const photos =
        req.files?.photos
          ?.map(
            (file) =>
              `/uploads/${file.filename}`
          ) || [];


      // ==========================================
      // VOICE
      // ==========================================

      let voiceRecording =
        "";

      if (
        req.files
          ?.voiceRecording?.[0]
      ) {
        voiceRecording =
          `/uploads/${
            req.files
              .voiceRecording[0]
              .filename
          }`;
      }


      // ==========================================
      // VIDEO
      // ==========================================

      let videoRecording =
        "";

      if (
        req.files
          ?.videoRecording?.[0]
      ) {
        videoRecording =
          `/uploads/${
            req.files
              .videoRecording[0]
              .filename
          }`;
      }


      // ==========================================
      // SAVE TO MONGODB
      // ==========================================

      const application =
        await Application.create({
          ...req.body,

          photos,

          voiceRecording,

          videoRecording,

          status: "pending",
        });


      res.status(201).json({
        success: true,

        message:
          "Application submitted successfully",

        application,
      });
    } catch (error) {
      console.error(
        "Application error:",
        error
      );

      res.status(400).json({
        success: false,

        message:
          "Failed to submit application",

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// EMAIL
// =====================================================

const transporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user:
        process.env.EMAIL_USER,

      pass:
        process.env.EMAIL_APP_PASSWORD,
    },
  });


// =====================================================
// HELPERS
// =====================================================

function escapeRegex(value = "") {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,

    message:
      "I Love Latinas API is running",
  });
});


// =====================================================
// ADMIN LOGIN
// =====================================================

app.post(
  "/api/admin/login",

  async (req, res) => {
    try {
      const {
        identifier,
        password,
      } = req.body;

      if (
        !identifier ||
        !password
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Username/Email and password are required",
          });
      }

      const cleanIdentifier =
        String(identifier).trim();

      const safeIdentifier =
        escapeRegex(
          cleanIdentifier
        );

      const admin =
        await Admin.findOne({
          $or: [
            {
              email:
                cleanIdentifier
                  .toLowerCase(),
            },

            {
              name: {
                $regex:
                  `^${safeIdentifier}$`,

                $options:
                  "i",
              },
            },
          ],
        });

      if (!admin) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Invalid username/email or password",
          });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          admin.password
        );

      if (!passwordMatch) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Invalid username/email or password",
          });
      }

      admin.lastLogin =
        new Date();

      await admin.save();

      const token =
        jwt.sign(
          {
            adminId:
              admin._id.toString(),

            email:
              admin.email,

            role:
              "admin",
          },

          process.env.JWT_SECRET,

          {
            expiresIn:
              "7d",
          }
        );

      return res.json({
        success: true,

        message:
          "Login successful",

        token,

        admin: {
          id:
            admin._id,

          name:
            admin.name,

          email:
            admin.email,

          role:
            "admin",

          lastLogin:
            admin.lastLogin,
        },
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Login failed",
        });
    }
  }
);


// =====================================================
// ADMIN PROFILE
// =====================================================

app.get(
  "/api/admin/me",

  adminAuth,

  async (req, res) => {
    try {
      const admin =
        await Admin.findById(
          req.admin.adminId
        ).select(
          "-password -resetOtpHash -resetOtpExpires"
        );

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin not found",
          });
      }

      return res.json({
        success: true,
        admin,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Could not load admin profile",
        });
    }
  }
);


// =====================================================
// UPDATE ADMIN PROFILE
// =====================================================

app.put(
  "/api/admin/profile",

  adminAuth,

  async (req, res) => {
    try {
      const {
        name,
        email,
      } = req.body;

      if (
        !name ||
        !email
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Name and email are required",
          });
      }

      const cleanEmail =
        String(email)
          .trim()
          .toLowerCase();

      const duplicate =
        await Admin.findOne({
          email:
            cleanEmail,

          _id: {
            $ne:
              req.admin.adminId,
          },
        });

      if (duplicate) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Email is already in use",
          });
      }

      const admin =
        await Admin.findByIdAndUpdate(
          req.admin.adminId,

          {
            $set: {
              name:
                String(name)
                  .trim(),

              email:
                cleanEmail,
            },
          },

          {
            returnDocument: "after",

            runValidators:
              true,
          }
        ).select(
          "-password -resetOtpHash -resetOtpExpires"
        );

      return res.json({
        success: true,

        message:
          "Profile updated successfully",

        admin,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Profile update failed",
        });
    }
  }
);


// =====================================================
// CHANGE ADMIN PASSWORD
// =====================================================

app.put(
  "/api/admin/change-password",

  adminAuth,

  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Current and new password are required",
          });
      }

      if (
        String(
          newPassword
        ).length < 6
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "New password must be at least 6 characters",
          });
      }

      const admin =
        await Admin.findById(
          req.admin.adminId
        );

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin not found",
          });
      }

      const match =
        await bcrypt.compare(
          currentPassword,
          admin.password
        );

      if (!match) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Current password is incorrect",
          });
      }

      admin.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      await admin.save();

      return res.json({
        success: true,

        message:
          "Password changed successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Password change failed",
        });
    }
  }
);


// =====================================================
// FORGOT PASSWORD
// =====================================================

app.post(
  "/api/admin/forgot-password",

  async (req, res) => {
    try {
      const {
        email,
      } = req.body;

      if (!email) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Email is required",
          });
      }

      const admin =
        await Admin.findOne({
          email:
            String(email)
              .trim()
              .toLowerCase(),
        });

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin account not found",
          });
      }

      if (
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_APP_PASSWORD
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              "Email service is not configured",
          });
      }

      const otp =
        Math.floor(
          100000 +
          Math.random() *
          900000
        ).toString();

      admin.resetOtpHash =
        crypto
          .createHash(
            "sha256"
          )
          .update(otp)
          .digest("hex");

      admin.resetOtpExpires =
        new Date(
          Date.now() +
          10 *
          60 *
          1000
        );

      await admin.save();

      await transporter.sendMail({
        from:
          `"I Love Latinas Admin" <${process.env.EMAIL_USER}>`,

        to:
          admin.email,

        subject:
          "Admin Password Reset OTP",

        html: `
          <div style="font-family:Arial;padding:20px">
            <h2>Password Reset</h2>
            <p>Your OTP is:</p>
            <h1>${otp}</h1>
            <p>Valid for 10 minutes.</p>
          </div>
        `,
      });

      return res.json({
        success: true,

        message:
          "OTP sent successfully",
      });
    } catch (error) {
      console.error(
        "OTP ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "OTP could not be sent",
        });
    }
  }
);


// =====================================================
// VERIFY OTP
// =====================================================

app.post(
  "/api/admin/verify-reset-otp",

  async (req, res) => {
    try {
      const {
        email,
        otp,
      } = req.body;

      if (
        !email ||
        !otp
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Email and OTP are required",
          });
      }

      const admin =
        await Admin.findOne({
          email:
            String(email)
              .trim()
              .toLowerCase(),
        });

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin not found",
          });
      }

      if (
        !admin.resetOtpHash ||
        !admin.resetOtpExpires
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Please request a new OTP",
          });
      }

      if (
        admin.resetOtpExpires <
        new Date()
      ) {
        admin.resetOtpHash =
          null;

        admin.resetOtpExpires =
          null;

        await admin.save();

        return res
          .status(400)
          .json({
            success: false,

            message:
              "OTP expired",
          });
      }

      const otpHash =
        crypto
          .createHash(
            "sha256"
          )
          .update(
            String(otp)
          )
          .digest("hex");

      if (
        otpHash !==
        admin.resetOtpHash
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid OTP",
          });
      }

      const resetToken =
        jwt.sign(
          {
            adminId:
              admin._id.toString(),

            purpose:
              "password-reset",
          },

          process.env.JWT_SECRET,

          {
            expiresIn:
              "15m",
          }
        );

      return res.json({
        success: true,

        resetToken,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "OTP verification failed",
        });
    }
  }
);


// =====================================================
// RESET PASSWORD
// =====================================================

app.post(
  "/api/admin/reset-password",

  async (req, res) => {
    try {
      const {
        resetToken,
        newPassword,
      } = req.body;

      if (
        !resetToken ||
        !newPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Reset token and new password are required",
          });
      }

      if (
        String(
          newPassword
        ).length < 6
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Password must be at least 6 characters",
          });
      }

      const decoded =
        jwt.verify(
          resetToken,
          process.env.JWT_SECRET
        );

      if (
        decoded.purpose !==
        "password-reset"
      ) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Invalid reset token",
          });
      }

      const admin =
        await Admin.findById(
          decoded.adminId
        );

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin not found",
          });
      }

      admin.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      admin.resetOtpHash =
        null;

      admin.resetOtpExpires =
        null;

      await admin.save();

      return res.json({
        success: true,

        message:
          "Password reset successfully",
      });
    } catch (error) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Reset token expired or invalid",
        });
    }
  }
);


// =====================================================
// DASHBOARD
// ONLY APPLICATION COUNT
// =====================================================

app.get(
  "/api/admin/dashboard",

  adminAuth,

  async (req, res) => {
    try {
      const admin =
        await Admin.findById(
          req.admin.adminId
        ).select(
          "-password -resetOtpHash -resetOtpExpires"
        );

      if (!admin) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Admin not found",
          });
      }

      const applications =
        await Application
          .countDocuments({
            status:
              "pending",
          });

      return res.json({
        success: true,

        admin,

        stats: {
          applications,
        },
      });
    } catch (error) {
      console.error(
        "DASHBOARD ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Dashboard data load failed",
        });
    }
  }
);


// =====================================================
// GET APPLICATIONS
// =====================================================

app.get(
  "/api/admin/applications",

  adminAuth,

  async (req, res) => {
    try {
      const applications =
        await Application
          .find({})
          .sort({
            createdAt:
              -1,
          });

      return res.json({
        success: true,

        applications,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Applications load failed",
        });
    }
  }
);


// =====================================================
// GET SINGLE APPLICATION
// =====================================================

app.get(
  "/api/admin/applications/:id",

  adminAuth,

  async (req, res) => {
    try {
      const application =
        await Application.findById(
          req.params.id
        );

      if (!application) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Application not found",
          });
      }

      return res.json({
        success: true,

        application,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Application details load failed",
        });
    }
  }
);


// =====================================================
// APPROVE APPLICATION
// APPROVED APPLICATION BECOMES MEMBER
// =====================================================

app.patch(
  "/api/admin/applications/:id/approve",

  adminAuth,

  async (req, res) => {
    try {
      const application =
        await Application.findById(
          req.params.id
        );

      if (!application) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Application not found",
          });
      }

      if (
        application.status !==
        "pending"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Application is already ${application.status}`,
          });
      }

      let member =
        await User.findOne({
          applicationId:
            application._id,
        });

      if (!member) {
        const internalEmail =
          `application-${application._id.toString()}@application.local`;

        const randomPassword =
          crypto
            .randomBytes(32)
            .toString("hex");

        const hashedPassword =
          await bcrypt.hash(
            randomPassword,
            10
          );

        member =
          await User.create({
            name:
              application.firstName ||
              "Member",

            email:
              internalEmail,

            password:
              hashedPassword,

            location:
              application
                .countryOfResidence ||
              "",

            status:
              "active",

            role:
              "user",

            applicationId:
              application._id,

            approvedAt:
              new Date(),
          });
      }

      application.status =
        "approved";

      await application.save();

      const fullMember =
        await User.findById(
          member._id
        )
          .select(
            "-password"
          )
          .populate({
            path:
              "applicationId",

            select:
              "-__v",
          });

      return res.json({
        success: true,

        message:
          "Application approved and member created successfully",

        member:
          fullMember,
      });
    } catch (error) {
      console.error(
        "APPROVE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Application approval failed",
        });
    }
  }
);


// =====================================================
// REJECT APPLICATION
// =====================================================

app.patch(
  "/api/admin/applications/:id/reject",

  adminAuth,

  async (req, res) => {
    try {
      const application =
        await Application.findById(
          req.params.id
        );

      if (!application) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Application not found",
          });
      }

      if (
        application.status !==
        "pending"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Application is already ${application.status}`,
          });
      }

      application.status =
        "rejected";

      await application.save();

      return res.json({
        success: true,

        message:
          "Application rejected successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Application rejection failed",
        });
    }
  }
);


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }

  return res.status(400).json({
    success: false,
    message:
      error.message ||
      "Something went wrong",
    error:
      error.message ||
      "Unknown server error",
  });
});


// =====================================================
// 404
// =====================================================

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,

        message:
          `Route not found: ${req.method} ${req.originalUrl}`,
      });
  }
);


// =====================================================
// SERVER START
// =====================================================

const PORT =
  process.env.PORT ||
  5000;

mongoose
  .connect(
    process.env.MONGO_URI
  )

  .then(
    async () => {
      console.log(
        "MongoDB connected successfully"
      );

      const adminCount =
        await Admin.countDocuments(
          {}
        );

      if (
        adminCount > 1
      ) {
        console.warn(
          `WARNING: ${adminCount} admins exist`
        );
      }

      app.listen(
        PORT,

        () => {
          console.log(
            `Server running on http://localhost:${PORT}`
          );
        }
      );
    }
  )

  .catch(
    (error) => {
      console.error(
        "MongoDB connection failed:",
        error.message
      );
    }
  );


  