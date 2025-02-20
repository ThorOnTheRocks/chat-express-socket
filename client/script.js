import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const getUsername = async () => {
  const username = localStorage.getItem("username");
  if (username) {
    console.log(`User existed ${username}`);
    return username;
  }

  const res = await fetch(
    "https://random-data-api.com/api/users/random_user"
  );
  const { username: randomUsername } = await res.json();
  console.log({ res });

  localStorage.setItem("username", randomUsername);
  return randomUsername;
};

export const socket = io({
  auth: {
    username: await getUsername(),
    serverOffset: 0,
  },
});

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

socket.on("chat message", (msg, serverOffset, username) => {
  const item = document.createElement("li");
  const paragraph = document.createElement("p");
  const smallText = document.createElement("small");
  paragraph.textContent = msg;
  smallText.textContent = username;
  messages.appendChild(item);
  item.appendChild(paragraph);
  item.appendChild(smallText);
  socket.auth.serverOffset = serverOffset;
  messages.scrollTop = messages.scrollHeight;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
  }
});
