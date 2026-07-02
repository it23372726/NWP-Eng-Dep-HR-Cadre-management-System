import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import {
    fromMonthDayValue,
    toMonthDayValue
} from "../utils/monthDayDate";
import { datePickerTextFieldProps } from "../utils/formLayout";

export default function MonthDayPicker({
    label,
    name,
    value,
    onChange,
    helperText = "Annual increment day (month and day only)"
}) {
    const pickerValue = fromMonthDayValue(value);

    const handleChange = (nextValue) => {
        onChange({
            target: {
                name,
                value: toMonthDayValue(nextValue)
            }
        });
    };

    return (
        <DatePicker
            label={label}
            views={["month", "day"]}
            openTo="month"
            format="DD MMM"
            value={pickerValue}
            onChange={handleChange}
            slotProps={{
                textField: {
                    ...datePickerTextFieldProps,
                    helperText
                },
                calendarHeader: {
                    format: "MMMM"
                },
                field: {
                    clearable: true
                }
            }}
        />
    );
}
