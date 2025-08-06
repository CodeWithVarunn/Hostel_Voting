document.getElementById("sendOtpBtn").onclick = async () => {
  const form = document.forms["voteForm"];
  const email = form["email"].value;
  const sendOtpBtn = document.getElementById("sendOtpBtn");

  if (!email.endsWith("@dtu.ac.in")) {
    alert("Please enter a valid DTU email ID.");
    return;
  }

  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = "Sending...";

  try {
    const res = await fetch("/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("OTP sent to your DTU email.");
      document.getElementById("otpSection").style.display = "block";
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Error sending OTP:", err);
    alert("Server error. Try again.");
  } finally {
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = "Send OTP";
  }
};

document.getElementById("voteForm").onsubmit = async (e) => {
  e.preventDefault();

  const form = document.forms["voteForm"];
  const submitBtn = form.querySelector('button[type="submit"]');
  const name = form["name"].value;
  const email = form["email"].value;
  const room = form["room"].value;
  const otp = form["otp"].value;

  const ballot = {
    "President": form["president"].value,
    "Vice President": form["vice-president"].value,
    "General Secretary": form["general-secretary"].value,
    "Cultural and Soft Skill Secretary": form["cultural-secretary"].value,
    "Hostel Mess Secretary": form["mess-secretary"].value,
    "Sports Secretary": form["sports-secretary"].value,
    "Academic and Career Secretary": form["academic-secretary"].value,
    "Technical Events Secretary": form["technical-secretary"].value,
    "Environment and Sustainability Secretary": form["environment-secretary"].value,
    "Social Media, Publicity, and Communication Secretary": form["publicity-secretary"].value,
  };

  for (const position in ballot) {
    if (!ballot[position]) {
      alert(`You must select a candidate for the position: ${position}.`);
      return;
    }
  }

  const voteData = { name, email, room, otp, ballot };
  
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const res = await fetch("/submit-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voteData),
    });

    if (res.ok) {
      window.location.href = "confirmation.html";
    } else {
      const data = await res.json();
      const feedback = document.getElementById("feedback");
      feedback.textContent = data.message;
      feedback.style.color = "red";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Vote";
    }
  } catch (err) {
    console.error("Error submitting vote:", err);
    alert("Submission failed. Try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Vote";
  }
};