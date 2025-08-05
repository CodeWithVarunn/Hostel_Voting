document.addEventListener('DOMContentLoaded', async () => {
  await fetchVotes();
});

async function fetchVotes() {
  const votesContainer = document.getElementById('votesContainer');
  votesContainer.innerHTML = 'Loading...';

  try {
    const response = await fetch('http://localhost:3000/admin-votes');
    // ✅ CHANGE: The data is now an object with positions as keys
    const resultsByPosition = await response.json();

    // ✅ CHANGE: Updated check for empty results
    if (Object.keys(resultsByPosition).length === 0) {
      votesContainer.innerHTML = '<p>No votes yet.</p>';
      return;
    }

    votesContainer.innerHTML = '';

    // ✅ CHANGE: Loop through each position and display its results
    for (const position in resultsByPosition) {
      const positionTitle = document.createElement('h3');
      positionTitle.textContent = position;
      votesContainer.appendChild(positionTitle);

      const results = resultsByPosition[position];

      results.sort((a, b) => b.count - a.count);

      results.forEach(entry => {
        const voteCard = document.createElement('div');
        voteCard.className = 'vote-card';
        voteCard.innerHTML = `
          <p><strong>Candidate:</strong> ${entry.candidate}</p>
          <p><strong>Votes:</strong> ${entry.count}</p>
        `;
        votesContainer.appendChild(voteCard);
      });

      votesContainer.appendChild(document.createElement('hr'));
    }

  } catch (error) {
    console.error('Error fetching votes:', error);
    votesContainer.innerHTML = '<p style="color:red;">Failed to fetch votes. Check console for errors.</p>';
  }
}

document.getElementById('refreshBtn')?.addEventListener('click', fetchVotes);
