const express = require("express");
const app = express();

let morgan = require("morgan");
app.use(morgan("combined"));

let bodyParser = require("body-parser");
app.use(bodyParser.raw({ type: "*/*" }));

const cors = require("cors");
app.use(cors());

//Copy paste the following endpoint into your project so that your sourcecode will be in the submission certificate
app.get("/sourcecode", (req, res) => {
  res.send(
    require("fs")
      .readFileSync(__filename)
      .toString()
  );
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

let users = new Map();
let passwords = new Map();
let sessions = new Map();
let channels = new Map();
let joinedChannels = new Map();
let leftChannels = new Map();
let kickedUsers = new Map();
let bannedUsers = new Map();
let chatMessages = [];

let counter = 89;
let genSessionId = () => {
  counter = counter + 1;
  return "sess" + counter;
};

//sign-up
app.post("/signup", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let username = parsedBody.username;
  let password = parsedBody.password;

  if (!parsedBody.password) {
    res.send(
      JSON.stringify({ success: false, reason: "password field missing" })
    );
  }

  if (!parsedBody.username) {
    res.send(
      JSON.stringify({ success: false, reason: "username field missing" })
    );
  }

  if (passwords.has(parsedBody.username)) {
    if (!res.headersSent) {
      res.send(JSON.stringify({ success: false, reason: "Username exists" }));
    }
    return;
  }
  passwords.set(username, password);

  if (!res.headersSent) {
    res.send(JSON.stringify({ success: true }));
  }
});

//login
app.post("/login", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let usr = parsedBody.username;

  if (!parsedBody.password) {
    res.send(
      JSON.stringify({ success: false, reason: "password field missing" })
    );
  }

  if (!parsedBody.username) {
    res.send(
      JSON.stringify({ success: false, reason: "username field missing" })
    );
  }

  if (!passwords.has(usr)) {
    if (!res.headersSent) {
      res.send(
        JSON.stringify({ success: false, reason: "User does not exist" })
      );
    }
    return;
  }

  let actualPassword = parsedBody.password;
  let expectedPassword = passwords.get(usr);

  if (actualPassword === expectedPassword) {
    let sessId = genSessionId();
    sessions.set(sessId, usr);
    res.send(
      JSON.stringify({
        success: true,
        token: sessId
      })
    );
    return;
  }

  if (!res.headersSent) {
    res.send(
      JSON.stringify({
        success: false,
        reason: "Invalid password"
      })
    );
  }
});

//create-channel
app.post("/create-channel", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let createToken = req.headers.token;
  let channel = parsedBody.channelName;
  let userCreating = sessions.get(createToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  console.log(sessions);

  if (!sessions.has(createToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!parsedBody.channelName) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  console.log("checking");
  console.log(channels.has(userCreating));
  console.log(channels);

  if (channels.has(userCreating)) {
    console.log("here");
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel already exists"
      })
    );
    return;
  }

  console.log("***");

  if (!channels.has(userCreating)) {
    console.log("++++");
    channels.set(userCreating, channel);
    res.send(
      JSON.stringify({
        success: true
      })
    );
    return;
  }
});

//join-channel
app.post("/join-channel", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let joinToken = req.headers.token;
  let channelToJoin = parsedBody.channelName;
  let userJoined = sessions.get(joinToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!channelToJoin) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  if (!sessions.has(joinToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  console.log("checking");
  console.log(channels.has(channelToJoin));

  if (!Array.from(channels.values()).includes(channelToJoin)) {
    console.log("does not exist");
    console.log(!channels.has(channelToJoin));
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel does not exist"
      })
    );
    return;
  }

  if (joinedChannels.has(userJoined) && !leftChannels.has(userJoined)) {
    console.log(joinedChannels.has(userJoined));
    res.send(
      JSON.stringify({
        success: false,
        reason: "User has already joined"
      })
    );

    console.log("already joined");
    return;
  }

  if (bannedUsers.has(userJoined)) {
    console.log(bannedUsers.has(userJoined));
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is banned"
      })
    );

    console.log("banned");
    return;
  }

  if (leftChannels.has(userJoined)) {
    console.log(leftChannels.has(userJoined));
    joinedChannels.set(userJoined, channelToJoin);
    res.send(
      JSON.stringify({
        success: true
      })
    );

    return;
  }

  console.log("joining");
  joinedChannels.set(userJoined, channelToJoin);
  console.log(userJoined);
  console.log(joinedChannels);

  if (!res.headersSent) {
    res.send(
      JSON.stringify({
        success: true
      })
    );
    return;
  }
});

//leave-channel
app.post("/leave-channel", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let leaveToken = req.headers.token;
  let channelToLeave = parsedBody.channelName;
  let userLeft = sessions.get(leaveToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(leaveToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!channelToLeave) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  console.log("checking");
  console.log(channels.has(channelToLeave));

  if (!Array.from(channels.values()).includes(channelToLeave)) {
    console.log("does not exist");
    console.log(!channels.has(channelToLeave));
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel does not exist"
      })
    );
    return;
  }

  if (!joinedChannels.has(userLeft)) {
    console.log(!joinedChannels.has(userLeft));
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is not part of this channel"
      })
    );

    console.log("not part of this channel");
    return;
  }

  if (leftChannels.has(userLeft)) {
    console.log(joinedChannels.has(userLeft));
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is not part of this channel"
      })
    );

    console.log("already left");
    return;
  }

  console.log("leaving");
  leftChannels.set(userLeft, channelToLeave);
  console.log(userLeft);
  console.log(leftChannels);

  res.send(
    JSON.stringify({
      success: true
    })
  );
  return;
});

//joined
app.get("/joined", (req, res) => {
  let getMembersToken = req.headers.token;
  let channelToList = req.query.channelName;
  let userEnquiring = sessions.get(getMembersToken);

  console.log("get-joined");
  let channelNames = Array.from(channels.values());
  console.log(channelNames);
  console.log(channelToList);
  let existing = channelNames.includes(channelToList);
  console.log(existing);
  if (existing === false) {
    console.log("get-joined");
    let bool = !Array.from(channels.values()).includes(channelToList);
    console.log(bool);
    console.log(Array.from(channels.values()));
    console.log("does not exist");
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel does not exist"
      })
    );
    return;
  }

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(getMembersToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!joinedChannels.has(userEnquiring)) {
    console.log(!joinedChannels.has(userEnquiring));
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is not part of this channel"
      })
    );

    console.log("not part of this channel");
    return;
  }

  let users = [...joinedChannels.entries()]
    .filter(({ 1: v }) => v === channelToList)
    .map(([k]) => k);

  res.send(
    JSON.stringify({
      success: true,
      joined: users
    })
  );
  return;
});

//delete
app.post("/delete", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let deleteToken = req.headers.token;
  let channelToDelete = parsedBody.channelName;
  let userDeleting = sessions.get(deleteToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(deleteToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));

    return;
  }

  if (!channelToDelete) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  console.log("checking");
  console.log(channels.has(channelToDelete));

  if (!Array.from(channels.values()).includes(channelToDelete)) {
    console.log("does not exist");
    console.log(!channels.has(channelToDelete));
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel does not exist"
      })
    );
    return;
  }

  //   let keyToDelete = [...channels.entries()]
  //         .filter(({ 1: v }) => v === channelToDelete)
  //         .map(([k]) => k);

  // console.log(keyToDelete)
  // console.log(channels)
  // console.log(joinedChannels)
  console.log("deleting");
  channels.delete(userDeleting);
  console.log("deleted");
  joinedChannels.delete(userDeleting);
  console.log(channels);
  console.log(joinedChannels);
  res.send(
    JSON.stringify({
      success: true
    })
  );
  return;
});

//kick
app.post("/kick", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let kickMemberToken = req.headers.token;
  let targetChannel = parsedBody.channelName;
  let target = parsedBody.target;
  let userKicking = sessions.get(kickMemberToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(kickMemberToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!targetChannel) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  if (!target) {
    res.send(
      JSON.stringify({ success: false, reason: "target field missing" })
    );
    return;
  }

  if (channels.get(userKicking) != targetChannel) {
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel not owned by user"
      })
    );

    console.log("not owned by user");
    return;
  }

  kickedUsers.set(target, targetChannel);
  joinedChannels.delete(target);
  res.send(
    JSON.stringify({
      success: true
    })
  );
  return;
});

//ban
app.post("/ban", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let banMemberToken = req.headers.token;
  let affectedChannel = parsedBody.channelName;
  let banTarget = parsedBody.target;
  let userBanning = sessions.get(banMemberToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(banMemberToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!affectedChannel) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  if (!banTarget) {
    res.send(
      JSON.stringify({ success: false, reason: "target field missing" })
    );
    return;
  }

  if (!(channels.get(userBanning) === affectedChannel)) {
    console.log(channels.get(userBanning));
    console.log(affectedChannel);
    console.log(channels.get(userBanning) === affectedChannel);
    console.log(!(channels.get(userBanning) === affectedChannel));
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel not owned by user"
      })
    );

    console.log("not owned by user");
    return;
  }

  bannedUsers.set(banTarget, affectedChannel);
  res.send(
    JSON.stringify({
      success: true
    })
  );
  return;
});

//message
app.post("/message", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let senderToken = req.headers.token;
  let receivingChannel = parsedBody.channelName;
  let messageContent = parsedBody.contents;
  let userPosting = sessions.get(senderToken);

  if (!req.headers.token) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }

  if (!sessions.has(senderToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!receivingChannel) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  if (!messageContent) {
    res.send(
      JSON.stringify({ success: false, reason: "contents field missing" })
    );
    return;
  }

  if (joinedChannels.get(userPosting) != receivingChannel) {
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is not part of this channel"
      })
    );

    return;
  }

  chatMessages.push({
    channel: receivingChannel,
    from: userPosting,
    contents: messageContent
  });
  res.send(
    JSON.stringify({
      success: true
    })
  );
  return;
});

app.get("/messages", (req, res) => {
  let getMsgToken = req.headers.token;
  let channelToView = req.query.channelName;
  let userViewing = sessions.get(getMsgToken);

  if (!channelToView) {
    res.send(
      JSON.stringify({ success: false, reason: "channelName field missing" })
    );
    return;
  }

  if (!Array.from(channels.values()).includes(channelToView)) {
    console.log("does not exist");
    console.log(!channels.has(channelToView));
    res.send(
      JSON.stringify({
        success: false,
        reason: "Channel does not exist"
      })
    );
    return;
  }

  if (joinedChannels.get(userViewing) !== channelToView) {
    res.send(
      JSON.stringify({
        success: false,
        reason: "User is not part of this channel"
      })
    );

    return;
  }

  console.log(chatMessages);
  let channelMessages = chatMessages.filter(function(msg) {
    return msg.channel === channelToView;
  });
  console.log(chatMessages);
  console.log(channelMessages);

  if (channelMessages.length === 0) {
    res.send(
      JSON.stringify({
        success: true,
        messages: channelMessages
      })
    );

    return;
  }

  let toSend = [];
  for (let i = 0; i < channelMessages.length; i++) {
    toSend.push({
      from: channelMessages[i].from,
      contents: channelMessages[i].contents
    });
  }
  console.log(toSend);

  res.send(
    JSON.stringify({
      success: true,
      messages: toSend
    })
  );
  return;
});
