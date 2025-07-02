// performance-test.js - Run with Node.js
const axios = require("axios");
const fs = require("fs");

// Configuration
const BASE_URL = "http://localhost:5000/api";
const TOTAL_USERS = 5;
const POSTS_PER_USER = 10;
const COMMENTS_PER_POST = 3;
const LIKES_PER_POST = 2;
const USERS_TO_TEST_PASSWORD_RESET = 2; // Number of users to test password reset functionality

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
  forgotPasswordTimes: [],
  resetPasswordTimes: [],
  changePasswordTimes: [],
  getMeTimes: [],
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
        const userId = loginResult.data.data ? loginResult.data.data.id : null;
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
          id: postResult.data.data.id,
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

// Test auth features - new function to test new auth features
const testAuthFeatures = async () => {
  console.log("Testing authentication features...");

  // Test getMe endpoint for all users
  for (const user of users) {
    const getMeResult = await measureTime(() =>
      axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    results.getMeTimes.push(getMeResult.time);
  }

  // Test forgot password for some users
  const usersToTest = users.slice(0, USERS_TO_TEST_PASSWORD_RESET);
  console.log(`Testing password reset flow for ${usersToTest.length} users...`);

  const resetTokens = []; // Array to store reset tokens

  for (const user of usersToTest) {
    // 1. Request password reset
    console.log(`Requesting password reset for ${user.email}...`);
    const forgotPasswordResult = await measureTime(() =>
      axios.post(`${BASE_URL}/auth/forgot-password`, {
        email: user.email,
      })
    );
    results.forgotPasswordTimes.push(forgotPasswordResult.time);

    // Debug output to check response
    console.log(
      "Forgot password response:",
      JSON.stringify(forgotPasswordResult.data, null, 2)
    );

    // Store the reset token (in development mode, the API returns the token directly)
    if (forgotPasswordResult.success && forgotPasswordResult.data.resetToken) {
      const resetToken = forgotPasswordResult.data.resetToken;
      resetTokens.push({
        user,
        resetToken,
      });
      console.log(
        `Got reset token for ${user.email}: ${resetToken.substring(0, 5)}...`
      );
    } else {
      console.log(`Failed to get reset token for ${user.email}`);
    }
  }

  // Now test the reset password endpoint for each token
  for (const { user, resetToken } of resetTokens) {
    // 2. Reset password
    console.log(`Resetting password for ${user.email}...`);
    const newPassword = "NewPassword456!";
    const resetPasswordResult = await measureTime(() =>
      axios.put(`${BASE_URL}/auth/reset-password/${resetToken}`, {
        password: newPassword,
      })
    );
    results.resetPasswordTimes.push(resetPasswordResult.time);

    // Debug output
    if (resetPasswordResult.success) {
      console.log(`Successfully reset password for ${user.email}`);
    } else {
      console.log(
        `Failed to reset password for ${user.email}:`,
        resetPasswordResult.error
      );
    }

    // 3. Login with new password to verify
    if (resetPasswordResult.success) {
      console.log(`Verifying login with new password for ${user.email}...`);
      const loginResult = await measureTime(() =>
        axios.post(`${BASE_URL}/auth/login`, {
          email: user.email,
          password: newPassword,
        })
      );

      if (loginResult.success) {
        // Update token in our users array
        user.token = loginResult.data.token;
        user.password = newPassword;
        console.log(
          `Successfully logged in with new password for ${user.email}`
        );
      } else {
        console.log(`Failed to login with new password for ${user.email}`);
      }
    }
  }

  // Test change password (when logged in)
  console.log("Testing change password functionality...");
  for (const user of users.slice(0, USERS_TO_TEST_PASSWORD_RESET)) {
    const newerPassword = "YetAnotherPass789!";

    console.log(`Changing password for ${user.email}...`);
    const changePasswordResult = await measureTime(() =>
      axios.put(
        `${BASE_URL}/auth/change-password`,
        {
          currentPassword: user.password,
          newPassword: newerPassword,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      )
    );
    results.changePasswordTimes.push(changePasswordResult.time);

    if (changePasswordResult.success) {
      console.log(`Successfully changed password for ${user.email}`);

      // Verify by logging in again
      console.log(`Verifying login after password change for ${user.email}...`);
      const verifyLoginResult = await measureTime(() =>
        axios.post(`${BASE_URL}/auth/login`, {
          email: user.email,
          password: newerPassword,
        })
      );

      if (verifyLoginResult.success) {
        user.password = newerPassword;
        user.token = verifyLoginResult.data.token;
        console.log(
          `Successfully verified login after password change for ${user.email}`
        );
      } else {
        console.log(
          `Failed to verify login after password change for ${user.email}`
        );
      }
    } else {
      console.log(
        `Failed to change password for ${user.email}:`,
        changePasswordResult.error
      );
    }
  }

  console.log("Completed authentication features tests");
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
    getMe: calculateStats(results.getMeTimes),
    forgotPassword: calculateStats(results.forgotPasswordTimes),
    resetPassword: calculateStats(results.resetPasswordTimes),
    changePassword: calculateStats(results.changePasswordTimes),
  };

  const report = {
    timestamp: new Date().toISOString(),
    testConfig: {
      users: TOTAL_USERS,
      postsPerUser: POSTS_PER_USER,
      commentsPerPost: COMMENTS_PER_POST,
      likesPerPost: LIKES_PER_POST,
      usersTestedForPasswordReset: USERS_TO_TEST_PASSWORD_RESET,
    },
    totalCounts: {
      users: users.length,
      posts: posts.length,
      likes: results.likeTimes.length,
      comments: results.commentTimes.length,
      passwordResets: results.resetPasswordTimes.length,
      passwordChanges: results.changePasswordTimes.length,
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
  console.log(
    `Performed ${report.totalCounts.passwordResets} password resets and ${report.totalCounts.passwordChanges} password changes`
  );

  console.log("\nResponse Time Summary (in ms):");
  console.log("Operation\t\tMin\tMax\tAvg\tMedian");
  console.log("-".repeat(70));

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
  printStats("Get Me", stats.getMe);
  printStats("Forgot Password", stats.forgotPassword);
  printStats("Reset Password", stats.resetPassword);
  printStats("Change Password", stats.changePassword);

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
    ...results.getMeTimes,
    ...results.forgotPasswordTimes,
    ...results.resetPasswordTimes,
    ...results.changePasswordTimes,
  ];

  const overallStats = calculateStats(allTimes);
  console.log("-".repeat(70));
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
    await testAuthFeatures(); // Test new auth features

    const report = generateReport();
    await cleanUp();

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(
      `🏁 Performance test completed in ${totalTime.toFixed(2)} seconds`
    );

    return report;
  } catch (error) {
    console.error("❌ Error running performance test:", error);
    console.error(error.stack);
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
  testAuthFeatures,
  generateReport,
};
