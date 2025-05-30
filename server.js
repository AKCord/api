import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

const formSubmissionLimiter = rateLimit({
  windowMs: 12 * 60 * 60 * 1000,
  max: 1, // limit each IP to 5 form submissions per hour
  standardHeaders: true,
  message: {
    error:
      "Too many form submissions from this IP, please try again after an hour",
    code: 429,
  },
});

const app = express();

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(formSubmissionLimiter);

/**
 * Converts a Date object or timestamp to Discord timestamp format
 * @param {Date|number} date - Date object or timestamp in milliseconds
 * @param {string} format - Optional format style ('t'|'T'|'d'|'D'|'f'|'F'|'R')
 * @returns {string} Discord timestamp
 *
 * Format styles:
 * t - Short time (e.g., 9:41 PM)
 * T - Long time (e.g., 9:41:30 PM)
 * d - Short date (e.g., 07/20/2021)
 * D - Long date (e.g., July 20, 2021)
 * f - Short date/time (e.g., July 20, 2021 9:41 PM)
 * F - Long date/time (e.g., Tuesday, July 20, 2021 9:41 PM)
 * R - Relative time (e.g., 2 hours ago)
 */
function discordTimestamp(date, format = "f") {
  // Convert Date object to Unix timestamp (seconds)
  const timestamp =
    date instanceof Date
      ? Math.floor(date.getTime() / 1000)
      : Math.floor(date / 1000);

  // Valid format styles
  const validFormats = ["t", "T", "d", "D", "f", "F", "R"];

  // Use default format if provided format is invalid
  const style = validFormats.includes(format) ? format : "f";

  // Return Discord timestamp format
  return `<t:${timestamp}:${style}>`;
}

app.post("/api/sendForm", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      error: "Please fill in the necessary fields.",
    });
  }

  try {
    const webhookURL = process.env.WEBHOOK_URL;
    if (!webhookURL) {
      return res.status(500).json({
        error: "Webhook URL not configured",
      });
    }

    const payload = {
      content: "<@884062132004618321>",
      embeds: [
        {
          title: "New Form Submission!",
          description: `Submitted: **${discordTimestamp(new Date())}**`,
          color: 16777215,
          fields: [
            {
              name: "Name",
              value: name,
            },
            {
              name: "Email",
              value: email,
            },
            {
              name: "Message",
              value: `\`${message}\``,
            },
          ],
        },
      ],
    };

    await axios.post(webhookURL, payload);
    return res.json({ message: "Done!", code: 200 });
  } catch (error) {
    console.error("Error sending to webhook:", error);
    return res.json({ error: "An Error Occurred!", errorMsg: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Discord Webhook Server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
