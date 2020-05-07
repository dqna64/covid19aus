const submitBut = document.getElementById("submit");
submitBut.addEventListener("click", async (event) => {
  const name = $("#username").textContent;
  const email = $("#email").textContent;
  const message = $("#message").textContent;
  console.log({ name, email, message });
});
