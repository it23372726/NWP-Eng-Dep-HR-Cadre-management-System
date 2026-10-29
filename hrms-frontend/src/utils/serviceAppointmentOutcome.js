export function serviceAppointmentOutcome(action) {
    const source = action?.fromDepartment?.trim();
    const destination = (action?.department || action?.toDepartment)?.trim();
    if (!source || !destination) return null;
    return source.toLowerCase() === destination.toLowerCase() ? "stay" : "transfer";
}
