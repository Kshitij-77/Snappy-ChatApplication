const msgModel = require("../model/msgModel");
const crypto = require("crypto");

// Add Messages
module.exports.addMessage = async (req, res, next) => {
  const encrypt = (msg) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      process.env.MESSAGE_ALGORITHM,
      process.env.MESSAGE_SECRET_KEY,
      iv
    );

    // encrypt msg
    const encrypted = Buffer.concat([cipher.update(msg), cipher.final()]);

    return {
      iv: iv.toString("hex"),
      content: encrypted.toString("hex"),
    };
  };

  // Add Message in db
  try {
    const { from, to, message } = req.body;
    const encryptedMsg = JSON.stringify(encrypt(message));
    const data = await msgModel.create({
      message: { text: encryptedMsg },
      users: [from, to],
      sender: from,
    });

    // if msg is not added
    if (!data)
      return res.json({ msg: "Failed to add message to the database." });
    return res.json({ msg: "Message added successfully." });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Get All Messages
module.exports.getAllMessages = async (req, res, next) => {
  const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(
      process.env.MESSAGE_ALGORITHM,
      process.env.MESSAGE_SECRET_KEY,
      Buffer.from(hash.iv, "hex")
    );

    // decrypt message
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(hash.content, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString();
  };

  // fetch messages from db
  try {
    const { from, to } = req.body;
    const messages = await msgModel
      .find({
        users: {
          $all: [from, to],
        },
      })
      .sort({ updatedAt: 1 });

    // return all messages
    const allMessages = messages?.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: decrypt(JSON.parse(msg.message.text)),
      };
    });

    res.json(allMessages);
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};
