// Stand-in for sharp. This Worker never uses the Images binding.
module.exports = function sharp() {
  throw new Error("sharp is not installed in the feedback Worker tooling.");
};
