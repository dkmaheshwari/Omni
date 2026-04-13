const mongoose = require("mongoose");

const threadCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color must be a valid hex color'
      }
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    threadCount: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

// Index for efficient queries (name already has unique index)
threadCategorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model("ThreadCategory", threadCategorySchema);