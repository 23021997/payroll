const validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function deductableInput(data) {
  let errors = {};

  data.name = !isEmpty(data.name) ? data.name : '';
  data.amount = !isEmpty(data.amount) ? data.amount : '';

  if(validator.isEmpty(data.name)){
    errors.name = 'Deductable name is required';
  }

  if (validator.isEmpty(data.amount)) {
    errors.amount = 'Amount field is required';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};