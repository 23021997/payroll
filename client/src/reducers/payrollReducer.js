import {
  VIEW_PAYROLL,
  VIEW_MONTHLY_PAYROLL,
  VIEW_PAYROLL_RECORDS,
  VIEW_PAYROLL_RECORDS_MONTHLY,
  VIEW_PAYROLL_RECORDS_YEARLY,
  PAYROLL_LOADING
} from "../actions/types";

const initialState = {
  payroll: [],
  payrolls: [],
  payrollRecords: [],
  payrollRecordsMonthly: [],
  payrollRecordsYearly: [],
  loading: false
};

export default function(state = initialState, action) {
  switch (action.type) {
    default:
      return state;

    case VIEW_PAYROLL:
      return {
        ...state,
        payroll: action.payload,
        loading: false
      };
    case VIEW_MONTHLY_PAYROLL:
      return {
        ...state,
        payrolls: action.payload,
        loading: false
      };
    case VIEW_PAYROLL_RECORDS:
      return {
        ...state,
        payrollRecords: action.payload,
        loading: false
      };
    case VIEW_PAYROLL_RECORDS_MONTHLY:
      return {
        ...state,
        payrollRecordsMonthly: action.payload,
        loading: false
      };
    case VIEW_PAYROLL_RECORDS_YEARLY:
      return {
        ...state,
        payrollRecordsYearly: action.payload,
        loading: false
      };
    case PAYROLL_LOADING:
      return {
        ...state,
        loading: true
      };
  }
}
