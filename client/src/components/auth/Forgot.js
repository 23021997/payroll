import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { sendResetLink } from "../../actions/authActions";
import TextFieldGroup from "../common/TextFieldGroup";
import { toast } from "react-toastify";

class Forgot extends Component {
  constructor() {
    super();

    this.state = {
      email: "",
      errors: {}
    };

    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.auth.isAuthenticated) {
      nextProps.history.push('/dashboard');
    }
    if (nextProps.errors) {
      return {
        errors: nextProps.errors
      };
    }
  }

  onChange(e) {
    this.setState({ [e.target.name]: e.target.value });
  }

  onSubmit(e) {
    e.preventDefault();

    const userEmail = {
        email: this.state.email
    }

    this.props
      .sendResetLink(userEmail)
      .then(res => {
        if (res.type === "GET_SUCCESS")
          toast.success("Password reset link sent, check your inbox!");
      })
      .catch(err => console.log(err));
  }

  render() {
    const { errors } = this.state;

    return (
      <div className="login-bg">
        <div id="app">
          <section className="section">
            <div className="container">
              <div className="row justify-content-center mt-5">
                <div className="col-5">
                  <div className="card card-primary mt-5">
                    <div className="card-header justify-content-center">
                      <h3>Reset Password</h3>
                    </div>
                    <p className="mx-auto text-warning">
                      *Enter the email which you registered with to get a reset
                      link
                    </p>
                    <div className="card-body">
                      <form onSubmit={this.onSubmit}>
                        <TextFieldGroup
                          placeholder="Email Address"
                          label="Email"
                          type="email"
                          value={this.state.email}
                          name="email"
                          onChange={this.onChange}
                          error={errors.email}
                          tabindex="1"
                        />

                        <p>
                          Back to <Link to="/">Login</Link>
                        </p>
                        <div className="form-group mt-4 mb-5">
                          <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-block"
                            tabIndex="4"
                          >
                            Send Reset Link
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                  <div className="simple-footer text-white">
                    Copyright &copy; Payroller 2018
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
}

Forgot.propTypes = {
  sendResetLink: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth,
  errors: state.errors
});

export default connect(
  mapStateToProps,
  { sendResetLink }
)(Forgot);