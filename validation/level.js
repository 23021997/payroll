const validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function levelInput(data) {
  let errors = {};

  data.name = !isEmpty(data.name) ? data.name : '';
  data.basic = !isEmpty(data.basic) ? data.basic : '';

  if(validator.isEmpty(data.name)){
    errors.name = 'Level name is required';
  }

  if (validator.isEmpty(data.basic)) {
    errors.basic = 'Basic salary field is required';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};