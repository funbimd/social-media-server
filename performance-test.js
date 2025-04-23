// performance-test.js - Run with Node.js
const axios = require("axios");
const fs = require("fs");

// Configuration
const BASE_URL = "http://localhost:5000/api";
const TOTAL_USERS = 5;
const POSTS_PER_USER = 10;
const COMMENTS_PER_POST = 3;
const LIKES_PER_POST = 2;

// Storage
const users = [];
const posts = [];
const results = {
  registrationTimes: [],
  loginTimes: [],
  createPostTimes: [],
  getFeedTimes: [],
  getProfileTimes: [],
  searchTimes: [],
  likeTimes: [],
  commentTimes: [],
};

// Helper to measure response time
const measureTime = async (apiCall) => {
  const start = Date.now();
  try {
    const response = await apiCall();
    const time = Date.now() - start;
    return { success: true, time, data: response.data };
  } catch (error) {
    const time = Date.now() - start;
    return {
      success: false,
      time,
      error: error.response ? error.response.data : error.message,
    };
  }
};

// Create users
const createUsers = async () => {
  console.log(`Creating ${TOTAL_USERS} test users...`);

  for (let i = 0; i < TOTAL_USERS; i++) {
    const username = `perftest_user_${Date.now()}_${i}`;
    const email = `${username}@example.com`;
    const password = "Password123!";

    // Register
    const registerResult = await measureTime(() =>
      axios.post(`${BASE_URL}/auth/register`, { username, email, password })
    );
    results.registrationTimes.push(registerResult.time);

    if (registerResult.success) {
      // Login
      const loginResult = await measureTime(() =>
        axios.post(`${BASE_URL}/auth/login`, { email, password })
      );
      results.loginTimes.push(loginResult.time);

      if (loginResult.success) {
        const token = loginResult.data.token;
        const userId = loginResult.data.data ? loginResult.data.data._id : null;
        users.push({ username, email, password, token, userId });
      }
    }
  }

  console.log(`Created ${users.length} users successfully`);
};

// Create posts
const createPosts = async () => {
  console.log(`Creating ${POSTS_PER_USER} posts for each user...`);

  for (const user of users) {
    for (let i = 0; i < POSTS_PER_USER; i++) {
      const postResult = await measureTime(() =>
        axios.post(
          `${BASE_URL}/posts`,
          {
            text: `Performance test post ${i} by ${
              user.username
            } at ${Date.now()}`,
            image: i % 2 === 0 ? "https://picsum.photos/200/300" : undefined,
          },
          { headers: { Authorization: `Bearer ${user.token}` } }
        )
      );
      results.createPostTimes.push(postResult.time);

      if (postResult.success && postResult.data.data) {
        posts.push({
          id: postResult.data.data._id,
          userId: user.userId,
          userToken: user.token,
        });
      }
    }
  }

  console.log(`Created ${posts.length} posts successfully`);
};

// Add likes to posts
const addLikes = async () => {
  console.log("Adding likes to posts...");

  for (const post of posts.slice(0, posts.length / 2)) {
    // Like half of the posts
    for (let i = 0; i < Math.min(LIKES_PER_POST, users.length); i++) {
      const user = users[i];
      const likeResult = await measureTime(() =>
        axios.put(
          `${BASE_URL}/posts/${post.id}/like`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        )
      );
      results.likeTimes.push(likeResult.time);
    }
  }

  console.log("Added likes successfully");
};

// Add comments to posts
const addComments = async () => {
  console.log("Adding comments to posts...");

  for (const post of posts.slice(0, posts.length / 2)) {
    // Comment on half of the posts
    for (let i = 0; i < Math.min(COMMENTS_PER_POST, users.length); i++) {
      const user = users[i];
      const commentResult = await measureTime(() =>
        axios.post(
          `${BASE_URL}/posts/${post.id}/comments`,
          { text: `Comment ${i} by ${user.username} at ${Date.now()}` },
          { headers: { Authorization: `Bearer ${user.token}` } }
        )
      );
      results.commentTimes.push(commentResult.time);
    }
  }

  console.log("Added comments successfully");
};

// Test feeds and profiles
const testFeeds = async () => {
  console.log("Testing feeds and profile performance...");

  for (const user of users) {
    // Test feed
    const feedResult = await measureTime(() =>
      axios.get(`${BASE_URL}/posts/feed?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    results.getFeedTimes.push(feedResult.time);

    // Test profile
    const profileResult = await measureTime(() =>
      axios.get(`${BASE_URL}/profiles/${user.userId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    results.getProfileTimes.push(profileResult.time);

    // Test search
    const searchResult = await measureTime(() =>
      axios.get(`${BASE_URL}/search/users?username=perf`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    results.searchTimes.push(searchResult.time);
  }

  console.log("Completed feed and profile tests");
};

// Calculate statistics
const calculateStats = (times) => {
  if (times.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  return { min, max, avg, median };
};

// Generate report
const generateReport = () => {
  const stats = {
    registration: calculateStats(results.registrationTimes),
    login: calculateStats(results.loginTimes),
    createPost: calculateStats(results.createPostTimes),
    getFeed: calculateStats(results.getFeedTimes),
    getProfile: calculateStats(results.getProfileTimes),
    search: calculateStats(results.searchTimes),
    like: calculateStats(results.likeTimes),
    comment: calculateStats(results.commentTimes),
  };

  const report = {
    timestamp: new Date().toISOString(),
    testConfig: {
      users: TOTAL_USERS,
      postsPerUser: POSTS_PER_USER,
      commentsPerPost: COMMENTS_PER_POST,
      likesPerPost: LIKES_PER_POST,
    },
    totalCounts: {
      users: users.length,
      posts: posts.length,
      likes: results.likeTimes.length,
      comments: results.commentTimes.length,
    },
    responseTimeStats: stats,
  };

  // Write report to file
  const reportFileName = `performance-report-${Date.now()}.json`;
  fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2));
  console.log(`Performance report saved to ${reportFileName}`);

  // Print summary to console
  console.log("\n======= PERFORMANCE TEST RESULTS =======");
  console.log(`Test completed at: ${report.timestamp}`);
  console.log(
    `Created ${report.totalCounts.users} users, ${report.totalCounts.posts} posts, ${report.totalCounts.comments} comments, and ${report.totalCounts.likes} likes`
  );

  console.log("\nResponse Time Summary (in ms):");
  console.log("Operation\t\tMin\tMax\tAvg\tMedian");
  console.log("-".repeat(60));

  const printStats = (name, s) => {
    console.log(
      `${name.padEnd(20)}\t${Math.round(s.min)}\t${Math.round(
        s.max
      )}\t${Math.round(s.avg)}\t${Math.round(s.median)}`
    );
  };

  printStats("Registration", stats.registration);
  printStats("Login", stats.login);
  printStats("Create Post", stats.createPost);
  printStats("Get Feed", stats.getFeed);
  printStats("Get Profile", stats.getProfile);
  printStats("Search", stats.search);
  printStats("Like Post", stats.like);
  printStats("Add Comment", stats.comment);

  // Calculate overall averages
  const allTimes = [
    ...results.registrationTimes,
    ...results.loginTimes,
    ...results.createPostTimes,
    ...results.getFeedTimes,
    ...results.getProfileTimes,
    ...results.searchTimes,
    ...results.likeTimes,
    ...results.commentTimes,
  ];

  const overallStats = calculateStats(allTimes);
  console.log("-".repeat(60));
  printStats("OVERALL", overallStats);
  console.log("======================================\n");

  return report;
};

// Clean up function to delete test data if needed
const cleanUp = async () => {
  console.log("Note: This script does not clean up created test data.");
  console.log("You may want to implement a cleanup function if needed.");
};

// Main execution function
const runPerformanceTest = async () => {
  try {
    console.log("🚀 Starting API performance test...");
    console.log(`Base URL: ${BASE_URL}`);

    const startTime = Date.now();

    await createUsers();
    await createPosts();
    await addLikes();
    await addComments();
    await testFeeds();

    const report = generateReport();
    await cleanUp();

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(
      `🏁 Performance test completed in ${totalTime.toFixed(2)} seconds`
    );

    return report;
  } catch (error) {
    console.error("❌ Error running performance test:", error);
    // Still try to generate a report with the data we have
    generateReport();
    process.exit(1);
  }
};

// Run the test if this script is executed directly
if (require.main === module) {
  runPerformanceTest();
}

// Export functions for potential use in other scripts
module.exports = {
  runPerformanceTest,
  createUsers,
  createPosts,
  addLikes,
  addComments,
  testFeeds,
  generateReport,
};
