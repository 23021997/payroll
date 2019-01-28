import axios from "axios";
import {
  VIEW_PAYROLL,
  VIEW_MONTHLY_PAYROLL,
  VIEW_PAYROLL_RECORDS,
  PAYROLL_LOADING,
  GET_ERRORS
} from "./types";

//View single payroll
export const getPayroll = id => dispatch => {
  dispatch(setPayrollLoading());
  return axios
    .get(`/api/payslip/singleslip/${id}`)
    .then(res =>
      dispatch({
        type: VIEW_PAYROLL,
        payload: res.data
      })
    )
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};

//Get aggregate monthly payroll
export const getMonthly = () => dispatch => {
  dispatch(setPayrollLoading());
  axios
    .get("/api/payslip/monthlyslip")
    .then(res =>
      dispatch({
        type: VIEW_MONTHLY_PAYROLL,
        payload: res.data
      })
    )
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};

export const getEmployeeYearlySlip = id => dispatch => {
  dispatch(setPayrollLoading());
  return axios
    .get(`/api/payslip/allslip/${id}`)
    .then(res =>
      dispatch({
        type: VIEW_PAYROLL_RECORDS,
        payload: res.data
      })
    )
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};

//Set loding state
export const setPayrollLoading = () => {
  return {
    type: PAYROLL_LOADING
  };
};
