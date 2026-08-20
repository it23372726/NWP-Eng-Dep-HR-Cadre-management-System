import api from "../api/axios";

export const generateCadreReport = async (startDate, endDate) => {
    const response = await api.post("/reports/cadre", {
        startDate,
        endDate
    });
    return response.data;
};

export const downloadCadreReportExcel = async (startDate, endDate) => {
    const response = await api.post(
        "/reports/cadre/export/excel",
        { startDate, endDate },
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadCadreReportPdf = async (startDate, endDate) => {
    const response = await api.post(
        "/reports/cadre/export/pdf",
        { startDate, endDate },
        { responseType: "blob" }
    );
    return response.data;
};

export const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const printPdfBlob = (blob) =>
    new Promise((resolve, reject) => {
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const url = window.URL.createObjectURL(pdfBlob);

        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Print report");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.cssText =
            "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        document.body.appendChild(iframe);

        const cleanup = () => {
            iframe.remove();
            window.URL.revokeObjectURL(url);
        };

        let finished = false;
        const finishOk = () => {
            if (finished) {
                return;
            }
            finished = true;
            window.setTimeout(cleanup, 120000);
            resolve();
        };

        const finishError = (error) => {
            if (finished) {
                return;
            }
            finished = true;
            cleanup();
            reject(error);
        };

        iframe.addEventListener("load", () => {
            window.setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    finishOk();
                } catch {
                    const printWindow = window.open(url, "_blank");
                    if (!printWindow) {
                        const error = new Error("Pop-up blocked");
                        error.code = "POPUP_BLOCKED";
                        finishError(error);
                        return;
                    }
                    finishOk();
                }
            }, 400);
        });

        iframe.addEventListener("error", () => {
            finishError(new Error("Unable to open the PDF for printing"));
        });

        iframe.src = url;

        window.setTimeout(() => {
            if (finished) {
                return;
            }
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                finishOk();
            } catch {
                const printWindow = window.open(url, "_blank");
                if (!printWindow) {
                    const error = new Error("Pop-up blocked");
                    error.code = "POPUP_BLOCKED";
                    finishError(error);
                    return;
                }
                finishOk();
            }
        }, 1500);
    });
