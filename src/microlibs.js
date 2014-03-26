////// Micro libs ////


module.exports = {
  assert : function (condition, message) {
    if (!condition) {
      console.log('Assertion failed', message);
      console.trace();
      throw new Error(message || "Assertion failed");
    }
  },


  check : function(condition, message) {
    if (!condition) {
      throw new Error(message || "Check failed");
    }
  },

  // http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object-from-json
  isEmptyObject : function(obj) {
    var name;
    for (name in obj) {
      return false;
    }
    return true;
  }
};

