





const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    // =====================================================
    // STEP 1
    // =====================================================

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    age: {
      type: Number,
      required: true,
      min: 21,
      max: 99,
    },

    gender: {
      type: String,
      required: true,
      trim: true,
    },

    // Multiple photos
    photos: {
      type: [String],
      default: [],
    },

    athleticType: {
      type: String,
      default: "",
      trim: true,
    },

    personalityType: {
      type: String,
      default: "",
      trim: true,
    },

    voiceRecording: {
      type: String,
      default: "",
    },

    videoRecording: {
      type: String,
      default: "",
    },

    countryOfBirth: {
      type: String,
      required: true,
      trim: true,
    },

    countryOfResidence: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================================
    // STEP 2
    // =====================================================

    businessOwner: {
      type: String,
      default: "",
      trim: true,
    },

    employed: {
      type: String,
      default: "",
      trim: true,
    },

    profession: {
      type: String,
      default: "",
      trim: true,
    },

    jobExperience: {
      type: String,
      default: "",
      trim: true,
    },

    specificSkills: {
      type: String,
      default: "",
      trim: true,
    },

    languagesSpoken: {
      type: String,
      default: "",
      trim: true,
    },

    countriesVisited: {
      type: String,
      default: "",
      trim: true,
    },

    desireToRelocate: {
      type: String,
      default: "",
      trim: true,
    },

    children: {
      type: String,
      default: "",
      trim: true,
    },

    wantChildren: {
      type: String,
      default: "",
      trim: true,
    },

    // =====================================================
    // STEP 3
    // =====================================================

    relationshipStatus: {
      type: String,
      default: "",
      trim: true,
    },

    relationshipDesired: {
      type: String,
      default: "",
      trim: true,
    },

    visionStatement: {
      type: String,
      default: "",
      trim: true,
    },

    hobbies: {
      type: String,
      default: "",
      trim: true,
    },

    characteristicsDesired: {
      type: String,
      default: "",
      trim: true,
    },

    legalProblems: {
      type: String,
      default: "",
      trim: true,
    },

    drink: {
      type: String,
      default: "",
      trim: true,
    },

    cigaretteSmoker: {
      type: String,
      default: "",
      trim: true,
    },

    marijuana: {
      type: String,
      default: "",
      trim: true,
    },

    drugsOther: {
      type: String,
      default: "",
      trim: true,
    },

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Application",
  applicationSchema
);