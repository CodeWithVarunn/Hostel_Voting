const SUPABASE_URL = 'https://haxkhjxbozglmziagdiv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheGtoanhib3pnbG16aWFnZGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMzY5NjgsImV4cCI6MjA2OTkxMjk2OH0.AdK9WZ8hr6_hX3W-AO5h9pLZKgoLxQ6Zd4MYC-Qvdy0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authToken = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const adminContent = document.getElementById('adminContent');
    const adminLogin = document.getElementById('adminLogin');

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;
            const loginError = document.getElementById('loginError');
            loginError.textContent = ''; // Clear previous errors

            try {
                const response = await fetch('/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                const data = await response.json();
                if (response.ok) {
                    authToken = data.token;
                    adminLogin.style.display = 'none';
                    adminContent.style.display = 'block';
                    await fetchVotes();
                    listenForRealtimeVotes();
                } else {
                    loginError.textContent = data.message || "Login failed.";
                }
            } catch (error) {
                console.error('Login error:', error);
                loginError.textContent = "An error occurred. Please try again.";
            }
        };
    }
});


async function fetchVotes() {
    if (!authToken) {
        console.error("Authentication token not found.");
        return;
    }

    try {
        const response = await fetch('/admin-votes', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch votes');
        }

        const resultsByPosition = await response.json();
        await displayVotes(resultsByPosition);
    } catch (error) {
        console.error('Error fetching votes:', error);
        document.getElementById('votesContainer').innerHTML = '<p style="color:red;">Failed to load vote results.</p>';
    }
}

function displayVotes(resultsByPosition) {
    const votesContainer = document.getElementById('votesContainer');
    votesContainer.innerHTML = ''; 

    if (Object.keys(resultsByPosition).length === 0) {
        votesContainer.innerHTML = '<p>No votes have been cast yet.</p>';
        return;
    }

    // Define the order of positions
    const positionOrder = [
        "President", "Vice President", "General Secretary", "Hostel Mess Secretary", "Sports Secretary", 
        "Cultural and Soft Skill Secretary", "Academic and Career Secretary", "Technical Events Secretary", 
        "Environment and Sustainability Secretary", "Social Media, Publicity, and Communication Secretary"
    ];

    positionOrder.forEach(position => {
        if (resultsByPosition[position]) {
            const positionContainer = document.createElement('div');
            positionContainer.className = 'position-container';

            const positionTitle = document.createElement('h3');
            positionTitle.textContent = position;
            positionContainer.appendChild(positionTitle);

            const results = resultsByPosition[position];
            results.sort((a, b) => b.count - a.count); // Sort by vote count

            const totalVotes = results.reduce((sum, current) => sum + current.count, 0);

            results.forEach(entry => {
                const percentage = totalVotes > 0 ? (entry.count / totalVotes) * 100 : 0;
                const voteCard = document.createElement('div');
                voteCard.className = 'vote-card';
                
                voteCard.innerHTML = `
                    <div class="vote-details">
                        <span>${entry.candidate}</span>
                        <strong>${entry.count} Votes</strong>
                    </div>
                    <div class="vote-bar-container">
                        <div class="vote-bar" style="width: ${percentage}%;"></div>
                    </div>
                `;
                positionContainer.appendChild(voteCard);
            });
            votesContainer.appendChild(positionContainer);
        }
    });
}

function listenForRealtimeVotes() {
    console.log("Listening for real-time vote updates...");
    supabase.channel('public:votes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, payload => {
            console.log('New vote received!', payload.new);
            fetchVotes();
        })
        .subscribe();
}