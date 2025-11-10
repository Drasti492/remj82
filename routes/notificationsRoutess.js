const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");
const auth = require("../middleware/auth");

// Get all notifications for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ date: -1 });
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark one notification as read/unread
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const notif = await Notification.findOne({ _id: id, user: req.user._id });
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    notif.read = read;
    await notif.save();
    res.json({ message: "Notification updated", notification: notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// Mark all notifications as read
router.patch("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// Delete a notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, user: req.user._id });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

// Delete all notifications
router.delete("/delete-all", auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ message: "All notifications deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete all notifications" });
  }
});

module.exports = router;
