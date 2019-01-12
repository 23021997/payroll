import { VIEW_PAYROLL, VIEW_MONTHLY_PAYROLL, PAYROLL_LOADING } from "../actions/types";

const initialState = {
  payroll: [],
  payrolls: [],
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
      }

    case PAYROLL_LOADING:
      return {
        ...state,
        loading: true
      };
  }
}
