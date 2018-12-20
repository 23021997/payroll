import {combineReducers} from 'redux';
import authReducer from './authReducer';
import errorReducer from './errorReducer';
import dashReducer from './dashReducer';
import levelReducer from './levelReducer';
import employeeReducer from './employeeReducer';

export default combineReducers({
    auth: authReducer,
    errors: errorReducer,
    dashboard: dashReducer,
    levels: levelReducer,
    employees: employeeReducer
});