document.addEventListener('DOMContentLoaded', () => {
    // --- Custom Alert Modal Logic ---
    const customAlert = document.getElementById('custom-alert');
    const modalMessage = document.getElementById('modal-message');
    const modalOkBtn = document.getElementById('modal-ok-btn');

    function showModal(message) {
        if (modalMessage) {
            modalMessage.textContent = message;
        }
        if (customAlert) {
            customAlert.classList.add('visible');
        }
    }

    if (modalOkBtn) {
        modalOkBtn.onclick = () => {
            if (customAlert) {
                customAlert.classList.remove('visible');
            }
        };
    }
    // --- End Custom Alert Modal Logic ---

    // --- Custom Select Dropdown Logic ---
    function initializeCustomSelects() {
        const wrappers = document.getElementsByClassName("custom-select-wrapper");
        for (let i = 0; i < wrappers.length; i++) {
            const selectEl = wrappers[i].getElementsByTagName("select")[0];
            if (!selectEl) continue;

            // Create the main selected item display
            const selectedDiv = document.createElement("DIV");
            selectedDiv.setAttribute("class", "select-selected");
            selectedDiv.innerHTML = selectEl.options[selectEl.selectedIndex].innerHTML;
            wrappers[i].appendChild(selectedDiv);

            // Create the options container
            const optionsDiv = document.createElement("DIV");
            optionsDiv.setAttribute("class", "select-items select-hide");

            // Create each option
            for (let j = 0; j < selectEl.length; j++) {
                if (selectEl.options[j].disabled) continue; // Skip placeholders
                
                const option = document.createElement("DIV");
                option.innerHTML = selectEl.options[j].innerHTML;

                option.addEventListener("click", function(e) {
                    const s = this.parentNode.parentNode.getElementsByTagName("select")[0];
                    const sl = this.parentNode.previousSibling;
                    for (let k = 0; k < s.length; k++) {
                        if (s.options[k].innerHTML == this.innerHTML) {
                            s.selectedIndex = k;
                            sl.innerHTML = this.innerHTML;
                            const y = this.parentNode.getElementsByClassName("same-as-selected");
                            for (let l = 0; l < y.length; l++) {
                                y[l].removeAttribute("class");
                            }
                            this.setAttribute("class", "same-as-selected");
                            break;
                        }
                    }
                    sl.click(); // Trigger a click on the selected div to close the box
                });
                optionsDiv.appendChild(option);
            }
            wrappers[i].appendChild(optionsDiv);

            selectedDiv.addEventListener("click", function(e) {
                e.stopPropagation();
                closeAllSelect(this);
                this.nextSibling.classList.toggle("select-hide");
                this.classList.toggle("select-arrow-active");
            });
        }
    }

    function closeAllSelect(elmnt) {
        const items = document.getElementsByClassName("select-items");
        const selected = document.getElementsByClassName("select-selected");
        for (let i = 0; i < selected.length; i++) {
            if (elmnt == selected[i]) {
                continue;
            }
            selected[i].classList.remove("select-arrow-active");
        }
        for (let i = 0; i < items.length; i++) {
            const selectDiv = elmnt.nextSibling;
            if (selectDiv !== items[i]) {
                items[i].classList.add("select-hide");
            }
        }
    }
    
    // Listen for clicks on the document to close dropdowns
    document.addEventListener("click", closeAllSelect);
    
    // Initialize the custom dropdowns
    initializeCustomSelects();
    // --- End Custom Select Dropdown Logic ---


    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const voteForm = document.getElementById("voteForm");

    if (sendOtpBtn) {
        sendOtpBtn.onclick = async () => {
            const email = voteForm["email"].value;
            if (!email || !email.endsWith("@dtu.ac.in")) {
                showModal("Please enter a valid DTU email ID.");
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
                    showModal("OTP sent to your DTU email.");
                    document.getElementById("otpSection").style.display = "block";
                } else {
                    showModal(data.message || "An error occurred.");
                }
            } catch (err) {
                console.error("Error sending OTP:", err);
                showModal("Server error. Please try again later.");
            } finally {
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send OTP";
            }
        };
    }

    if (voteForm) {
        voteForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = voteForm.querySelector('button[type="submit"]');
            const feedbackDiv = document.getElementById("feedback");

            if (feedbackDiv) {
                feedbackDiv.textContent = '';
            }

            const name = voteForm["name"].value;
            const email = voteForm["email"].value;
            const room = voteForm["room"].value;
            const otp = voteForm["otp"].value;

            const ballot = {
                "President": voteForm["president"].value,
                "Vice President": voteForm["vice-president"].value,
                "General Secretary": voteForm["general-secretary"].value,
                "Cultural and Soft Skill Secretary": voteForm["cultural-secretary"].value,
                "Hostel Mess Secretary": voteForm["mess-secretary"].value,
                "Sports Secretary": voteForm["sports-secretary"].value,
                "Academic and Career Secretary": voteForm["academic-secretary"].value,
                "Technical Events Secretary": voteForm["technical-secretary"].value,
                "Environment and Sustainability Secretary": voteForm["environment-secretary"].value,
                "Social Media, Publicity, and Communication Secretary": voteForm["publicity-secretary"].value,
            };

            for (const position in ballot) {
                if (!ballot[position]) {
                    showModal(`You must select a candidate for the position: ${position}.`);
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
                    if (feedbackDiv) {
                        feedbackDiv.textContent = data.message || "An unknown error occurred.";
                    }
                }
            } catch (err) {
                console.error("Error submitting vote:", err);
                if (feedbackDiv) {
                    feedbackDiv.textContent = "Submission failed due to a network error. Please try again.";
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Vote";
            }
        };
    }
});