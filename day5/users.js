// ---------- Elements ----------
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// All loaded users are stored here, so filtering never needs a new request
let allUsers = [];

// ---------- Render ----------
function renderUsers(list) {
  usersList.innerHTML = ""; // clears the list only; user text is added with textContent

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach(function (user) {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = "Email: " + user.email;

    const city = document.createElement("div");
    city.textContent = "City: " + user.address.city;

    const company = document.createElement("div");
    company.textContent = "Company: " + user.company.name;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}
// ---------- Load users ----------
async function loadUsers() {
  statusMessage.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Request failed with status " + response.status);
    }

    allUsers = await response.json();
    renderUsers(allUsers);
    statusMessage.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusMessage.textContent = "Error: could not load users. " + error.message;
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
// ---------- Filter ----------
filterInput.addEventListener("input", function () {
  const term = filterInput.value.trim().toLowerCase();

  const matches = allUsers.filter(function (user) {
    return user.name.toLowerCase().includes(term);
  });

  // Nothing loaded yet: leave the list alone
  if (allUsers.length === 0) {
    return;
  }

  renderUsers(matches);
});
