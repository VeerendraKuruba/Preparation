/**
 * JavaScript: Comment Moderator
 * 
 * Implement a comment moderation system to detect and remove
 * comments with inappropriate words.
 * 
 * Function Description:
 * Complete the function moderateComments(comments, inappropriateWords) in the editor below:
 * - comments {string[]} - An array of comments
 * - inappropriateWords {string[]} - An array of inappropriate words
 * - returns {string[]} - An array of moderated comments
 * 
 * The function takes an array of comments and an array of 
 * inappropriate words. It should return an array of comments that do not
 * contain inappropriate words.
 * 
 * Constraints:
 * - The comments array has at least 1 and at most 10^4 elements.
 * - Each comment in the comments array is a string with a maximum
 *   length of 1000.
 * - The inappropriateWords array has at least 1 and at most 100
 *   elements.
 * - Each word in the inappropriateWords array is a string with a
 *   maximum length of 50.
 */

/**
 * @param {string[]} comments - An array of comments
 * @param {string[]} inappropriateWords - An array of inappropriate words
 * @returns {string[]} - An array of moderated comments
 */
function moderateComments(comments, inappropriateWords) {
    return comments.filter(comment => {
        const lowerComment = comment.toLowerCase();
        return !inappropriateWords.some(word => 
            lowerComment.includes(word.toLowerCase())
        );
    });
}

// Sample Test Cases
console.log("===== Test Case 1 =====");
const comments1 = [
    "I love internet",
    "I hate this app",
    "This is a bad comment",
    "Nice"
];
const inappropriateWords1 = ["hate", "bad"];
console.log("Comments:", comments1);
console.log("Inappropriate Words:", inappropriateWords1);
console.log("Output:", moderateComments(comments1, inappropriateWords1));
console.log("Expected: ['I love internet', 'Nice']");

console.log("\n===== Test Case 2 =====");
const comments2 = [
    "Great product!",
    "This is terrible",
    "Amazing experience",
    "Worst service ever"
];
const inappropriateWords2 = ["terrible", "worst"];
console.log("Comments:", comments2);
console.log("Inappropriate Words:", inappropriateWords2);
console.log("Output:", moderateComments(comments2, inappropriateWords2));
console.log("Expected: ['Great product!', 'Amazing experience']");

console.log("\n===== Test Case 3 =====");
const comments3 = [
    "Hello world",
    "This is spam content",
    "Nice to meet you",
    "Stop spamming!"
];
const inappropriateWords3 = ["spam"];
console.log("Comments:", comments3);
console.log("Inappropriate Words:", inappropriateWords3);
console.log("Output:", moderateComments(comments3, inappropriateWords3));
console.log("Expected: ['Hello world', 'Nice to meet you']");

console.log("\n===== Test Case 4 - Case Insensitive =====");
const comments4 = [
    "I LOVE this",
    "HATE is a strong word",
    "Beautiful day"
];
const inappropriateWords4 = ["hate"];
console.log("Comments:", comments4);
console.log("Inappropriate Words:", inappropriateWords4);
console.log("Output:", moderateComments(comments4, inappropriateWords4));
console.log("Expected: ['I LOVE this', 'Beautiful day']");

console.log("\n===== Test Case 5 - With Punctuation =====");
const comments5 = [
    "Great!",
    "This is bad!",
    "Wonderful experience.",
    "bad, really bad"
];
const inappropriateWords5 = ["bad"];
console.log("Comments:", comments5);
console.log("Inappropriate Words:", inappropriateWords5);
console.log("Output:", moderateComments(comments5, inappropriateWords5));
console.log("Expected: ['Great!', 'Wonderful experience.']");

// Export for testing
module.exports = { moderateComments };

