import React from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";

const Netpay = props => {
  const { net } = props;

  const data = {
    labels: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "Öctober",
      "November",
      "December"
    ],
    datasets: [
      {
        label: "Monthly Net Pay",
        data: [
          net.january,
          net.february,
          net.march,
          net.april,
          net.may,
          net.june,
          net.july,
          net.august,
          net.september,
          net.october,
          net.november,
          net.december
        ],
        backgroundColor: "rgb(62, 202, 202)",
        pointRadius: 5,
      }
    ]
  };

  return (
    <div className="col-md-12">
      <div className="card">
        <div className="card-body">
          <Line data={data} height={90} options={{

          }} />
        </div>
      </div>
    </div>
  );
};

Netpay.propTypes = {
  net: PropTypes.object.isRequired
};

export default Netpay;
