// script.js (Corrected and Complete)

document.getElementById("sendOtpBtn").onclick = async () => {
  const form = document.forms["voteForm"];
  const email = form["email"].value;

  console.log("[DEBUG] Send OTP clicked with email:", email);

  if (!email.endsWith("@dtu.ac.in")) {
    alert("Please enter a valid DTU email ID.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    console.log("[DEBUG] Response from /send-otp:", data);

    if (res.ok) {
      alert("OTP sent to your DTU email.");
      document.getElementById("otpSection").style.display = "block";
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Error sending OTP:", err);
    alert("Server error. Try again.");
  }
};

document.getElementById("voteForm").onsubmit = async (e) => {
  e.preventDefault();

  const form = document.forms["voteForm"];
  const name = form["name"].value;
  const email = form["email"].value;
  const room = form["room"].value;
  const otp = form["otp"].value;

  // ✅ FIX: This object now collects the values from all 10 dropdowns
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

  // Validation to ensure all fields are selected
  for (const position in ballot) {
    if (!ballot[position]) {
      alert(`You must select a candidate for the position: ${position}.`);
      return; // Stop the submission if any vote is missing
    }
  }

  const voteData = { name, email, room, otp, ballot };
  console.log("[DEBUG] Submitting complete ballot:", voteData);

  try {
    const res = await fetch("http://localhost:3000/submit-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voteData),
    });

    const data = await res.json();
    console.log("[DEBUG] Response from /submit-vote:", data);

    const feedback = document.getElementById("feedback");
    feedback.textContent = data.message;
    feedback.style.color = res.ok ? "green" : "red";
  } catch (err) {
    console.error("Error submitting vote:", err);
    alert("Submission failed. Try again.");
  }
};