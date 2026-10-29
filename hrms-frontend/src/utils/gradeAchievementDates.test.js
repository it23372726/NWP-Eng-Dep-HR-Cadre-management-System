import test from "node:test";
import assert from "node:assert/strict";
import { completedInitialProbation, getProbationTimelineState, getCareerHistoryEventMinDate,
    getServiceAppointmentProbationYears, getEmployeeProbationMinDate } from "./gradeAchievementDates.js";
const event = (actionType, actionDate) => ({ actionType, actionDate });
const initial = event("NEW_APPOINTMENT", "2010-01-01");
const confirmed = event("PERMANENT_CONFIRMATION", "2013-01-01");
const change = event("SERVICE_APPOINTMENT", "2020-07-01");
const minimum = events => getCareerHistoryEventMinDate({ actionType: "PERMANENT_CONFIRMATION", timelineState: getProbationTimelineState(events) });
test("initial appointment keeps three years", () => assert.equal(minimum([initial]), "2013-01-01"));
test("confirmed prior three years qualifies exactly one year after service appointment", () => {
    assert.equal(minimum([initial, confirmed, change]), "2021-07-01");
    assert.equal(getServiceAppointmentProbationYears({dateOfFirstAppointment:"2010-01-01",careerProgression:{permanentConfirmationDate:"2013-01-01"}}, "2020-07-01"),1);
});
test("time served alone and premature confirmation do not qualify", () => {
    assert.equal(minimum([initial, change]), "2023-07-01");
    assert.equal(minimum([initial, event("PERMANENT_CONFIRMATION","2012-12-31"), change]), "2023-07-01");
});
test("qualification survives multiple service appointments", () => assert.equal(minimum([initial,confirmed,change,event("PERMANENT_CONFIRMATION","2021-07-01"),event("SERVICE_APPOINTMENT","2022-07-01")]),"2023-07-01"));
test("edited dates recalculate and leap-day anniversaries clamp", () => {
    assert.equal(minimum([initial,confirmed,event("SERVICE_APPOINTMENT","2020-02-29")]),"2021-02-28");
    assert.equal(completedInitialProbation("2016-02-29","2019-02-28"),true);
});
test("superseded and future confirmations cannot qualify", () => {
    const p={startDate:"2010-01-01",permanentConfirmationDate:"2013-01-01",superseded:true};
    assert.equal(getServiceAppointmentProbationYears({serviceAppointments:[p]},"2020-01-01"),3);
    assert.equal(getServiceAppointmentProbationYears({serviceAppointments:[{...p,superseded:false,permanentConfirmationDate:"2022-01-01"}]},"2020-01-01"),3);
});
test("existing service period ignores stale saved three-year end date", () => {
    const employee={dateOfFirstAppointment:"2020-07-01",currentServiceAppointmentKey:"new",serviceAppointments:[{appointmentKey:"INITIAL",startDate:"2010-01-01",permanentConfirmationDate:"2013-01-01"},{appointmentKey:"new",startDate:"2020-07-01",probationEndDate:"2023-07-01"}]};
    assert.equal(getEmployeeProbationMinDate(employee),"2021-07-01");
});
