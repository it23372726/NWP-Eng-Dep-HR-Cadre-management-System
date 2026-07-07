export const emptySpouseForm = () => ({
    nic: "",
    fullName: "",
    dateOfBirth: ""
});

export const emptyChildForm = () => ({
    nic: "",
    birthCertificateNo: "",
    fullName: "",
    dateOfBirth: "",
    relationship: ""
});

export const CHILD_RELATIONSHIP_OPTIONS = [
    { value: "SON", label: "Son" },
    { value: "DAUGHTER", label: "Daughter" }
];

export const isMarriedStatus = (maritalStatus) =>
    maritalStatus === "Married";

export function mapSpouseToForm(spouse) {
    if (!spouse) {
        return emptySpouseForm();
    }

    return {
        nic: spouse.nic ?? "",
        fullName: spouse.fullName ?? "",
        dateOfBirth: spouse.dateOfBirth ?? ""
    };
}

export function mapChildrenToForm(children) {
    if (!Array.isArray(children) || children.length === 0) {
        return [];
    }

    return children.map((child) => ({
        nic: child.nic ?? "",
        birthCertificateNo: child.birthCertificateNo ?? "",
        fullName: child.fullName ?? "",
        dateOfBirth: child.dateOfBirth ?? "",
        relationship: child.relationship ?? ""
    }));
}

export function clearDependentFormFields(formData) {
    return {
        ...formData,
        spouse: emptySpouseForm(),
        children: []
    };
}

export function applyMaritalStatusFormChanges(formData, name, value) {
    if (name !== "maritalStatus" || value === "Married") {
        return formData;
    }

    return clearDependentFormFields(formData);
}

function isBlankSpouse(spouse) {
    if (!spouse) {
        return true;
    }

    return !spouse.nic?.trim()
        && !spouse.fullName?.trim()
        && !spouse.dateOfBirth;
}

function isBlankChildRow(child) {
    return !child.nic?.trim()
        && !child.birthCertificateNo?.trim()
        && !child.fullName?.trim()
        && !child.dateOfBirth
        && !child.relationship;
}

export function filterChildrenForPayload(children) {
    if (!Array.isArray(children)) {
        return [];
    }

    return children
        .filter((child) => !isBlankChildRow(child))
        .map((child) => ({
            nic: child.nic?.trim() || null,
            birthCertificateNo: child.birthCertificateNo?.trim() || null,
            fullName: child.fullName?.trim() || null,
            dateOfBirth: child.dateOfBirth || null,
            relationship: child.relationship || null
        }));
}

export function buildDependentPayloadFields(formData) {
    if (!isMarriedStatus(formData.maritalStatus)) {
        return {
            spouse: null,
            children: []
        };
    }

    const spouse = formData.spouse ?? emptySpouseForm();

    return {
        spouse: isBlankSpouse(spouse)
            ? null
            : {
                nic: spouse.nic?.trim() || null,
                fullName: spouse.fullName?.trim() || null,
                dateOfBirth: spouse.dateOfBirth || null
            },
        children: filterChildrenForPayload(formData.children)
    };
}

export function validateDependentFields(formData) {
    if (!isMarriedStatus(formData.maritalStatus)) {
        return null;
    }

    const children = filterChildrenForPayload(formData.children);

    for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const label = `Child ${index + 1}`;

        if (!child.birthCertificateNo) {
            return `${label}: birth certificate number is required.`;
        }
        if (!child.fullName) {
            return `${label}: name is required.`;
        }
        if (!child.dateOfBirth) {
            return `${label}: date of birth is required.`;
        }
        if (!child.relationship) {
            return `${label}: relationship is required.`;
        }
    }

    return null;
}

export function formatChildRelationship(relationship) {
    if (relationship === "SON") {
        return "Son";
    }
    if (relationship === "DAUGHTER") {
        return "Daughter";
    }
    return relationship || "—";
}
