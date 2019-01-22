const express = require("express");
const router = express.Router();
const passport = require("passport");
const protect = passport.authenticate("jwt", { session: false });
const keys = require("../../config/keys");
const pdfMakePrinter = require("pdfmake/src/printer");
const path = require("path");
const fs = require("fs");
const emailTemplate = require("../../emailTemplates/emailTemplate");
const nodemailer = require("nodemailer");

//Load models
const Level = require("../../models/Level");
const Employee = require("../../models/Employee");
const Exception = require("../../models/Exception");
const IndividualCost = require("../../models/Individualcost");
const Payslip = require("../../models/Payslip");
const OneOffPayment = require("../../models/Oneoffpayment");

//@route  Get api/tax/singleslip/:id
//@desc Get Employee payslip route
//@access Private
router.get("/singleslip/:id", protect, (req, res) => {
  let date = new Date();
  let salaryDay = date.getDate();
  // let salaryDay = 23;
  const presentMonth = date.toLocaleString("en-us", { month: "long" });

  if (salaryDay > 21) {
    Employee.findOne({ _id: req.params.id }).where('is_delete').equals(0)
      .then(employeeDetails => {
        const employeeId = employeeDetails._id;
        const tag = employeeDetails.tag;
        const name = employeeDetails.name;
        const department = employeeDetails.department;
        const employeeEmail = employeeDetails.email;
        const designation = employeeDetails.designation;
        let oneOffPaymentIncomeSum = 0;
        let oneOffPaymentDeductionSum = 0;
        let oneOffPaymentArray = [];

        OneOffPayment.find({ employee: employeeId })
          .where("is_delete")
          .equals(0)
          .then(oneoffPaymentItems => {
            oneoffPaymentItems.forEach(oneoffPaymentItem => {
              if (presentMonth === oneoffPaymentItem.month) {
                let presentDate = date.getTime();
                let paymentDate = oneoffPaymentItem.date_added.getTime();
                let diffMilli = Math.abs(presentDate - paymentDate);
                let daysDiff = Math.round(diffMilli / (1000 * 60 * 60 * 24));

                if (daysDiff < 360) {
                  if (oneoffPaymentItem.costType === "income") {
                    oneOffPaymentIncomeSum += oneoffPaymentItem.amount;
                    oneOffPaymentArray.push(oneoffPaymentItem);
                  } else {
                    oneOffPaymentDeductionSum += oneoffPaymentItem.amount;
                    oneOffPaymentArray.push(oneoffPaymentItem);
                  }
                } else {
                  oneoffPaymentItem
                    .remove()
                    .then(() => {})
                    .catch(err => console.log(err));
                }
              }
            });

            //Get employee level
            Level.findOne({ _id: employeeDetails.level }).where('is_delete').equals(0)
              .then(level => {
                const bonuses = level.bonuses;
                const deductables = level.deductables;

                //Get Employee bonuses and deduction and sum total
                let levelBonus = level.bonuses;
                let levelDeductable = level.deductables;
                let deductableSum = 0;
                let bonusSum = 0;
                levelBonus.forEach(bonus => {
                  bonusSum += bonus.amount;
                });
                levelDeductable.forEach(deductable => {
                  deductableSum += deductable.amount;
                });

                //Check if employee has individual cost
                IndividualCost.find({ employee: employeeDetails._id }).where('is_delete').equals(0)
                  .then(individualcost => {
                    let individualIncomeSum = 0;
                    let individualDeductionSum = 0;

                    individualcost.forEach(individualcostItem => {
                      if (individualcostItem.costType === "income") {
                        individualIncomeSum += individualcostItem.amount;
                      } else {
                        individualDeductionSum += individualcostItem.amount;
                      }
                    });

                    //Check if employee has a salary exception
                    Exception.findOne({ employee: employeeDetails._id }).where('is_delete').equals(0)
                      .then(employeeException => {
                        if (employeeException) {
                          let basic = employeeException.amount;
                          let grossEarning =
                            bonusSum +
                            basic +
                            individualIncomeSum +
                            oneOffPaymentIncomeSum;
                          let annualGrossEarning = grossEarning * 12;
                          let annualBonuses =
                            (bonusSum +
                              individualIncomeSum +
                              oneOffPaymentIncomeSum) *
                            12;
                          let annualDeductables =
                            (deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum) *
                            12;

                          if (annualGrossEarning > 300000) {
                            let annualConsolidationRelief =
                              annualGrossEarning * 0.2 + 200000;
                            let annualPension = annualGrossEarning * 0.08;
                            let pension = annualPension / 12;
                            let consolidationRelief =
                              annualConsolidationRelief / 12;
                            let annualTaxableGrossIncome =
                              annualGrossEarning +
                              annualBonuses -
                              annualPension -
                              annualConsolidationRelief -
                              annualDeductables;
                            let taxableIncome = annualTaxableGrossIncome / 12 ;
                            let annualTax = taxCalculation(
                              annualTaxableGrossIncome
                            );
                            let tax = annualTax / 12;
                            let netPay =
                              grossEarning -
                              tax -
                              pension -
                              deductableSum -
                              individualDeductionSum -
                              oneOffPaymentDeductionSum;
                            let totalDeductable =
                              tax +
                              pension +
                              deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum;

                            //Payslip variables for frontend
                            const salarySlip = {
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductable,
                              netPay,
                              employeeDetails,
                              level,
                              individualcost,
                              employeeException,
                              oneOffPaymentArray
                            };

                            //payslip variables for server side further processing

                            const payslipDetails = {
                              tag,
                              name,
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductions: totalDeductable,
                              netPay,
                              email: employeeEmail,
                              designation,
                              employee: employeeId,
                              bonuses,
                              deductables,
                              individualcost,
                              oneOffPaymentArray,
                              taxableIncome,
                              presentMonth,
                              is_delete: 0
                            };

                            //Saves employee payslip details to db
                            Payslip.findOne({ employee: employeeDetails._id }, { is_delete: 0 })
                              .where("presentMonth")
                              .equals(presentMonth)
                              .then(payslipFound => {
                                if (payslipFound) {
                                  Payslip.findOneAndUpdate(
                                    { employee: employeeId },
                                    { $set: payslipDetails },
                                    { new: true }
                                  )
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                } else {
                                  new Payslip(payslipDetails)
                                    .save()
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                }
                              })
                              .catch(err => console.log(err));
                            return res.status(200).json(salarySlip);
                          } else {
                            let annualConsolidationRelief =
                              annualGrossEarning * 0.01;
                            let annualPension = annualGrossEarning * 0.08;
                            let pension = annualPension / 12;
                            let consolidationRelief =
                              annualConsolidationRelief / 12;
                            let annualTaxableGrossIncome =
                              annualGrossEarning +
                              annualBonuses -
                              annualPension -
                              annualConsolidationRelief -
                              annualDeductables;
                            let taxableIncome = annualTaxableGrossIncome / 12 ;
                            let annualTax = taxCalculation(
                              annualTaxableGrossIncome
                            );
                            let tax = annualTax / 12;
                            let netPay =
                              grossEarning -
                              tax -
                              pension -
                              deductableSum -
                              individualDeductionSum -
                              oneOffPaymentDeductionSum;
                            let totalDeductable =
                              tax +
                              pension +
                              deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum;

                            const salarySlip = {
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductable,
                              netPay,
                              employeeDetails,
                              individualcost,
                              level,
                              employeeException,
                              oneOffPaymentArray
                            };

                            const payslipDetails = {
                              tag,
                              name,
                              department,
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductions: totalDeductable,
                              netPay,
                              email: employeeEmail,
                              designation,
                              employee: employeeId,
                              bonuses,
                              deductables,
                              individualcost,
                              oneOffPaymentArray,
                              taxableIncome,
                              presentMonth,
                              is_delete: 0
                            };

                            Payslip.findOne({ employee: employeeDetails._id } ,{ is_delete: 0 })
                              .where("presentMonth")
                              .equals(presentMonth)
                              .then(payslipFound => {
                                if (payslipFound) {
                                  Payslip.findOneAndUpdate(
                                    { employee: employeeId },
                                    { $set: payslipDetails },
                                    { new: true }
                                  )
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                } else {
                                  new Payslip(payslipDetails)
                                    .save()
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                }
                              })
                              .catch(err => console.log(err));

                            return res.status(200).json(salarySlip);
                          }
                        } else {
                          let basic = level.basic;
                          let grossEarning =
                            bonusSum +
                            basic +
                            individualIncomeSum +
                            oneOffPaymentIncomeSum;
                          let annualGrossEarning = grossEarning * 12;
                          let annualBonuses =
                            (bonusSum +
                              individualIncomeSum +
                              oneOffPaymentIncomeSum) *
                            12;
                          let annualDeductables =
                            (deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum) *
                            12;

                          if (annualGrossEarning > 300000) {
                            let annualConsolidationRelief =
                              annualGrossEarning * 0.2 + 200000;
                            let annualPension = annualGrossEarning * 0.08;
                            let pension = annualPension / 12;
                            let consolidationRelief =
                              annualConsolidationRelief / 12;
                            let annualTaxableGrossIncome =
                              annualGrossEarning +
                              annualBonuses -
                              annualPension -
                              annualConsolidationRelief -
                              annualDeductables;
                            let taxableIncome = annualTaxableGrossIncome / 12 ;
                            let annualTax = taxCalculation(
                              annualTaxableGrossIncome
                            );
                            let tax = annualTax / 12;
                            let netPay =
                              grossEarning -
                              tax -
                              pension -
                              deductableSum -
                              individualDeductionSum -
                              oneOffPaymentDeductionSum;
                            let totalDeductable =
                              tax +
                              pension +
                              deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum;

                            const salarySlip = {
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductable,
                              netPay,
                              employeeDetails,
                              individualcost,
                              level,
                              oneOffPaymentArray
                            };

                            const payslipDetails = {
                              tag,
                              name,
                              department,
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductions: totalDeductable,
                              netPay,
                              email: employeeEmail,
                              designation,
                              employee: employeeId,
                              bonuses,
                              deductables,
                              individualcost,
                              oneOffPaymentArray,
                              taxableIncome,
                              presentMonth,
                              is_delete: 0
                            };

                            Payslip.findOne({ employee: employeeDetails._id }, { is_delete: 0 })
                              .where("presentMonth")
                              .equals(presentMonth)
                              .then(payslipFound => {
                                if (payslipFound) {
                                  Payslip.findOneAndUpdate(
                                    { employee: employeeId },
                                    { $set: payslipDetails },
                                    { new: true }
                                  )
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                } else {
                                  new Payslip(payslipDetails)
                                    .save()
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                }
                              })
                              .catch(err => console.log(err));

                            return res.status(200).json(salarySlip);
                          } else {
                            let annualConsolidationRelief =
                              annualGrossEarning * 0.01;
                            let annualPension = annualGrossEarning * 0.08;
                            let pension = annualPension / 12;
                            let consolidationRelief =
                              annualConsolidationRelief / 12;
                            let annualTaxableGrossIncome =
                              annualGrossEarning +
                              annualBonuses -
                              annualPension -
                              annualConsolidationRelief -
                              annualDeductables;
                            let taxableIncome = annualTaxableGrossIncome / 12 ;
                            let annualTax = taxCalculation(
                              annualTaxableGrossIncome
                            );
                            let tax = annualTax / 12;
                            let netPay =
                              grossEarning -
                              tax -
                              pension -
                              deductableSum -
                              individualDeductionSum -
                              oneOffPaymentDeductionSum;
                            let totalDeductable =
                              tax +
                              pension +
                              deductableSum +
                              individualDeductionSum +
                              oneOffPaymentDeductionSum;

                            const salarySlip = {
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductable,
                              netPay,
                              employeeDetails,
                              individualcost,
                              level,
                              oneOffPaymentArray
                            };

                            const payslipDetails = {
                              tag,
                              name,
                              department,
                              basic,
                              grossEarning,
                              tax,
                              pension,
                              consolidationRelief,
                              totalDeductions: totalDeductable,
                              netPay,
                              email: employeeEmail,
                              designation,
                              employee: employeeId,
                              bonuses,
                              deductables,
                              individualcost,
                              oneOffPaymentArray,
                              taxableIncome,
                              presentMonth,
                              is_delete: 0
                            };

                            Payslip.findOne({ employee: employeeDetails._id }, { is_delete: 0 })
                              .where("presentMonth")
                              .equals(presentMonth)
                              .then(payslipFound => {
                                if (payslipFound) {
                                  Payslip.findOneAndUpdate(
                                    { employee: employeeId },
                                    { $set: payslipDetails },
                                    { new: true }
                                  )
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                } else {
                                  new Payslip(payslipDetails)
                                    .save()
                                    .then(() => {})
                                    .catch(err => console.log(err));
                                }
                              })
                              .catch(err => console.log(err));

                            return res.status(200).json(salarySlip);
                          }
                        }
                      })
                      .catch(err => console.log(err));
                  })
                  .catch(err =>
                    res
                      .status(404)
                      .json({ message: "Error fetching other exception" })
                  );
              })
              .catch(err =>
                res.status(404).json({ message: "User grade level not found" })
              );
          })
          .catch(err => console.log(err));
      })
      .catch(err => res.status(404).json({ message: "Error fetching user" }));
  } else {
    res
      .status(400)
      .json({ message: "Salary report can only be generated after 21 days of a month!" });
  }
});

//@route  Post api/tax/singleslip/send/:id
//@desc Send Employee payslip pdf as email route
//@access Private
router.post("/singleslip/send/:id", protect, (req, res) => {
  const errors = {};
  const date = new Date();
  const presentMonth = date.toLocaleString("en-us", { month: "long" });

  Payslip.findOne({ employee: req.params.id }, { is_delete: 0 }).where('presentMonth').equals(presentMonth)
    .then(employeePayslip => {
      let moneyFix = money => {
        let fixedMoney = money.toFixed(2);
        return fixedMoney;
      };
      const formatMoney = money => {
        let formatedValue = money
          .toString()
          .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        return formatedValue;
      };
      const basic = moneyFix(employeePayslip.basic);
      const gross = moneyFix(employeePayslip.grossEarning);
      const net = moneyFix(employeePayslip.netPay);
      const deductions = moneyFix(employeePayslip.totalDeductions);
      const pension = moneyFix(employeePayslip.pension);
      const tax = moneyFix(employeePayslip.tax);

      //Begin insertion of earnings
      let payBonus = employeePayslip.bonuses;
      let otherEarnings = employeePayslip.individualcost;
      let oneOffPayment = employeePayslip.oneOffPaymentArray;

      let bodyData = [
        ["Earnings", "Amount"],
        ["Basic", `${formatMoney(basic)}`]
      ];

      //Insert payslip bonuses into rows
      payBonus.forEach(bonus => {
        let dataRow = [];

        dataRow.push(bonus.name);
        dataRow.push(formatMoney(bonus.amount));

        bodyData.push(dataRow);

        otherEarnings.forEach(otherEarning => {
          let earningRow = [];
          if (otherEarning.costType === "income") {
            earningRow.push(otherEarning.name);
            earningRow.push(formatMoney(otherEarning.amount));

            bodyData.push(earningRow);
          }
        });

        oneOffPayment.forEach(otherEarning => {
          let earningRow = [];
          if (otherEarning.costType === "income") {
            earningRow.push(otherEarning.name);
            earningRow.push(formatMoney(otherEarning.amount));

            bodyData.push(earningRow);
          }
        });
      });

      //End insertion of earnings

      //Begin insertion of earnings
      let payDeduction = employeePayslip.deductables;

      let bodyData1 = [
        ["Deductions", "Amount"],
        ["Tax", `${formatMoney(tax)}`],
        ["Pension", `${formatMoney(pension)}`]
      ];

      //Insert payslip deduction into rows
      payDeduction.forEach(deduction => {
        let dataRow = [];

        dataRow.push(deduction.name);
        dataRow.push(formatMoney(deduction.amount));

        bodyData1.push(dataRow);

        otherEarnings.forEach(otherEarning => {
          let earningRow = [];
          if (otherEarning.costType === "deduction") {
            earningRow.push(otherEarning.name);
            earningRow.push(formatMoney(otherEarning.amount));

            bodyData1.push(earningRow);
          }
        });

        oneOffPayment.forEach(otherEarning => {
          let earningRow = [];
          if (otherEarning.costType === "deduction") {
            earningRow.push(otherEarning.name);
            earningRow.push(formatMoney(otherEarning.amount));

            bodyData1.push(earningRow);
          }
        });
      });

      //End insertion of deductions

      //Write payslip data to pdf
      const docDefinition = {
        content: [
          { text: " " },
          {
            text: `${employeePayslip.name} payslip`,
            style: "header",
            alignment: "center"
          },
          { text: " " },
          { text: " " },
          { text: " " },
          {
            style: "tableExample",
            table: {
              widths: [268, 250],
              heights: 50,
              alignment: "center",
              body: [
                [
                  `Employee Name:  ${employeePayslip.name}`,
                  `Tax year:    ${date.getFullYear()}`
                ],
                [
                  `Emplyee Tag: 	${employeePayslip.tag}`,
                  `Pay period:   ${date.toLocaleString("en-us", {
                    month: "long"
                  })}`
                ],
                [
                  `Designation:  ${employeePayslip.designation}`,
                  `Department:   ${employeePayslip.department}`
                ],
                [
                  {
                    table: {
                      widths: [133, 117],
                      alignment: "center",
                      body: bodyData
                    },
                    layout: {
                      fillColor: function(rowIndex, node, columnIndex) {
                        return rowIndex % 2 === 0 ? "#CCCCCC" : null;
                      }
                    }
                  },
                  {
                    table: {
                      widths: [125, 106],
                      alignment: "center",
                      body: bodyData1
                    },
                    layout: {
                      fillColor: function(rowIndex, node, columnIndex) {
                        return rowIndex % 2 === 0 ? "#CCCCCC" : null;
                      }
                    }
                  }
                ],
                [`Gross Earnings:            ${formatMoney(gross)}`, ""],
                [`Total Deduction:            ${formatMoney(deductions)}`, ""],
                [`Net Pay:            ${formatMoney(net)}`, ""]
              ]
            }
          }
        ]
      };

      generatePdf(docDefinition, response => {
        pdfLocation = path.join(__dirname, "../../", "docs", "/payroll.pdf");

        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: keys.username,
            pass: keys.password,
            host: keys.smtp
          }
        });

        const htmlData = emailTemplate(employeePayslip);

        const options = {
          from: "no-reply@payroller.com",
          to: `${employeePayslip.email}`,
          subject: "Monthly Payroll",
          html: htmlData,
          attachments: [
            {
              path: pdfLocation,
              filename: "payroll.pdf"
            }
          ]
        };

        transporter.sendMail(options, (error, info) => {
          if (error) {
            return res
              .status(400)
              .json({ message: "Error sending employee payslip" });
          } else {
            fs.unlink(pdfLocation, err => {
              if (err) {
                console.log(err);
              }
              return res.json({ message: "Payslip successfully sent!" });
            });
          }
        });
      });
    })
    .catch(err => res.status(404).json({ message: "Error fetching payslip" }));
});

//@route  GET api/tax/mothlyslip
//@desc Get all Employees payslip route
//@access Private
router.get('/monthlyslip', protect, (req, res) => {

  let date = new Date;

  const presentMonth = date.toLocaleString("en-us", { month: "long" });

  let basicSum = 0, grossSum = 0, consolidationReliefSum = 0, pensionSum = 0, taxableIncomeSum = 0, taxSum = 0, netSum = 0;

  Payslip.find({is_delete: 0}).where('presentMonth').equals(presentMonth)
  .then(payslip => {

    payslip.forEach(payslipItem => {
      basicSum += payslipItem.basic
      grossSum += payslipItem.grossEarning
      consolidationReliefSum += payslipItem.consolidationRelief
      pensionSum += payslipItem.pension
      taxableIncomeSum += payslipItem.taxableIncome
      taxSum += payslipItem.tax
      netSum += payslipItem.netPay
    })

    const payrollDetails = {
      basicSum,
      grossSum,
      consolidationReliefSum,
      pensionSum,
      taxableIncomeSum,
      taxSum,
      netSum,
      payslip
    }

    res.json(payrollDetails)

  })
  .catch(err => console.log(err))
})

//@route  GET api/tax/
//@desc Get all Employees payslip route
//@access Private
router.get('/', protect, (req, res) => {
  Payslip.find()
  .then(payslips => res.json(payslips))
  .catch(err => console.log(payslips))
})

//@route  Delete api/tax/:id
//@desc Get all Employees payslip route
//@access Private
router.delete('/:id', protect, (req, res) => {
  Payslip.findOneAndRemove({_id: req.params.id})
  .then(() => res.json({message:'payslip removed'}))
  .catch(err => console.log(err))
})

const generatePdf = (docDefinition, successCallback, errorCallback) => {
  try {
    const fontDescriptors = {
      Roboto: {
        normal: path.join(__dirname, "../../", "fonts", "/Roboto-Regular.ttf"),
        bold: path.join(__dirname, "../../", "fonts", "/Roboto-Medium.ttf"),
        italics: path.join(__dirname, "../../", "fonts", "/Roboto-Italic.ttf"),
        bolditalics: path.join(
          __dirname,
          "../../",
          "fonts",
          "/Roboto-MediumItalic.ttf"
        )
      }
    };

    const printer = new pdfMakePrinter(fontDescriptors);
    const doc = printer.createPdfKitDocument(docDefinition);

    doc.pipe(
      fs.createWriteStream("docs/payroll.pdf").on("error", err => {
        errorCallback(err.message);
      })
    );

    doc.on("end", () => {
      successCallback("PDF successfully created and stored");
    });

    doc.end();
  } catch (err) {
    throw err;
  }
};

const taxCalculation = annualTaxableIncome => {
  let annualTaxMap = new Map([
    [1, 300000], //@7%
    [2, 300000], //@11%
    [3, 500000], //@15%
    [4, 500000], //@19%
    [5, 1600000], //@21%
    [6, 3200000] //@24%
  ]);

  let taxRateMap = new Map([
    [1, 0.07], //@7%
    [2, 0.11], //@11%
    [3, 0.15], //@15%
    [4, 0.19], //@19%
    [5, 0.21], //@21%
    [6, 0.24] //@24%
  ]);

  let totalTax = 0.0,
    annualTaxValue;

  if (annualTaxableIncome <= 300000) {
    annualTaxValue = annualTaxableIncome * taxRateMap.get(1).toFixed(2);
    return;
  } else {
    let lastAnnualIndex = 0,
      i;
    for (i = 1; i <= 6; i++) {
      if (annualTaxableIncome > annualTaxMap.get(i)) {
        let tax = annualTaxMap.get(i) * taxRateMap.get(i).toFixed(2);
        totalTax += parseFloat(tax);
        annualTaxableIncome -= annualTaxMap.get(i);
        lastAnnualIndex = i;
      } else break;
    }
    if (lastAnnualIndex !== 6) {
      ++lastAnnualIndex;
    }
    let tax = taxRateMap.get(lastAnnualIndex) * annualTaxableIncome;

    totalTax += tax;

    return totalTax;
  }
};

module.exports = router;
