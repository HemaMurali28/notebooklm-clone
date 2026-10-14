const API_URL = "https://notebooklm-clone-ffut.onrender.com";

let selectedDocument = null;


// ============================================================
// UPLOAD DOCUMENT
// ============================================================

async function uploadDocument() {

    const fileInput =
        document.getElementById("fileInput");

    const uploadStatus =
        document.getElementById("uploadStatus");

    const uploadButton =
        document.getElementById("uploadButton");

    const documentList =
        document.getElementById("documentList");

    const documentCount =
        document.getElementById("documentCount");


    // Check file
    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        if (uploadStatus) {
            uploadStatus.textContent =
                "Please select a document first.";
        }

        return;
    }


    const file =
        fileInput.files[0];


    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    // Disable upload button
    if (uploadButton) {

        uploadButton.disabled = true;

        uploadButton.textContent =
            "Uploading...";
    }


    if (uploadStatus) {

        uploadStatus.textContent =
            "Uploading document...";
    }


    try {

        // Send file to FastAPI
        const response =
            await fetch(
                API_URL + "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        // Check response
        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed."
            );
        }


        // ----------------------------------------------------
        // UPLOAD SUCCESS
        // ----------------------------------------------------

        if (uploadStatus) {

            uploadStatus.textContent =
                data.filename +
                " uploaded successfully!";
        }


        // ----------------------------------------------------
        // REMOVE EMPTY MESSAGE
        // ----------------------------------------------------

        if (documentList) {

            const emptyDocuments =
                documentList.querySelector(
                    ".empty-documents"
                );


            if (emptyDocuments) {
                emptyDocuments.remove();
            }


            // Create document item
            const documentItem =
                document.createElement(
                    "div"
                );


            documentItem.className =
                "document-item";


            documentItem.textContent =
                data.filename;


            documentItem.dataset.filename =
                data.filename;


            // ------------------------------------------------
            // SELECT NEWLY UPLOADED DOCUMENT
            // ------------------------------------------------

            documentItem.addEventListener(
                "click",
                function() {

                    selectDocument(
                        documentItem,
                        data.filename
                    );
                }
            );


            documentList.appendChild(
                documentItem
            );
        }


        // ----------------------------------------------------
        // UPDATE DOCUMENT COUNT
        // ----------------------------------------------------

        if (documentCount) {

            const currentCount =
                parseInt(
                    documentCount.textContent
                ) || 0;


            documentCount.textContent =
                currentCount + 1;
        }


        // Automatically select uploaded document
        selectedDocument =
            data.filename;


        // Highlight uploaded document
        const allDocuments =
            document.querySelectorAll(
                ".document-item"
            );


        allDocuments.forEach(
            function(item) {

                item.classList.remove(
                    "selected-document"
                );
            }
        );


        const newDocument =
            documentList
                ? documentList.lastElementChild
                : null;


        if (newDocument) {

            newDocument.classList.add(
                "selected-document"
            );
        }


        // Clear selected file
        fileInput.value = "";


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        if (uploadStatus) {

            uploadStatus.textContent =
                error.message;
        }


    } finally {

        // Enable button again
        if (uploadButton) {

            uploadButton.disabled =
                false;

            uploadButton.textContent =
                "Upload Document";
        }
    }
}



// ============================================================
// SELECT DOCUMENT
// ============================================================

function selectDocument(
    documentItem,
    filename
) {

    const allDocuments =
        document.querySelectorAll(
            ".document-item"
        );


    // Remove previous selection
    allDocuments.forEach(
        function(item) {

            item.classList.remove(
                "selected-document"
            );
        }
    );


    // Highlight selected document
    documentItem.classList.add(
        "selected-document"
    );


    // Store selected document
    selectedDocument =
        filename;


    console.log(
        "Selected document:",
        selectedDocument
    );
}



// ============================================================
// ASK QUESTION
// ============================================================

async function askQuestion() {

    const questionInput =
        document.getElementById(
            "questionInput"
        );


    const chatMessages =
        document.getElementById(
            "chatMessages"
        );


    const sourcesSection =
        document.getElementById(
            "sourcesSection"
        );


    const sources =
        document.getElementById(
            "sources"
        );


    const askButton =
        document.getElementById(
            "askButton"
        );


    // Check input
    if (!questionInput) {

        console.error(
            "questionInput element not found."
        );

        return;
    }


    const question =
        questionInput.value.trim();


    if (!question) {

        alert(
            "Please enter a question."
        );

        return;
    }


    // Disable button
    if (askButton) {

        askButton.disabled =
            true;

        askButton.textContent =
            "Thinking...";
    }


    // --------------------------------------------------------
    // REMOVE WELCOME MESSAGE
    // --------------------------------------------------------

    const welcomeMessage =
        document.querySelector(
            ".welcome-message"
        );


    if (welcomeMessage) {
        welcomeMessage.remove();
    }


    // --------------------------------------------------------
    // ADD USER MESSAGE
    // --------------------------------------------------------

    if (chatMessages) {

        const userMessage =
            document.createElement(
                "div"
            );


        userMessage.className =
            "chat-message user-message";


        userMessage.textContent =
            question;


        chatMessages.appendChild(
            userMessage
        );
    }


    // --------------------------------------------------------
    // ADD LOADING MESSAGE
    // --------------------------------------------------------

    let loadingMessage =
        null;


    if (chatMessages) {

        loadingMessage =
            document.createElement(
                "div"
            );


        loadingMessage.className =
            "chat-message ai-message";


        loadingMessage.textContent =
            "Thinking...";


        chatMessages.appendChild(
            loadingMessage
        );
    }


    try {

        // ----------------------------------------------------
        // CALL FASTAPI
        // ----------------------------------------------------

        const response =
            await fetch(
                API_URL + "/query",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    // SEND SELECTED DOCUMENT
                    body: JSON.stringify({
                        question:
                            question,

                        selected_document:
                            selectedDocument
                    })
                }
            );


        const data =
            await response.json();


        // Check response
        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Question failed."
            );
        }


        // ----------------------------------------------------
        // DISPLAY ANSWER
        // ----------------------------------------------------

        const answer =
            data.answer ||
            "No answer was generated.";


        if (loadingMessage) {

            loadingMessage.textContent =
                answer;
        }


        // ----------------------------------------------------
        // CLEAR OLD SOURCES
        // ----------------------------------------------------

        if (sources) {

            sources.innerHTML =
                "";
        }


        // Hide sources first
        if (sourcesSection) {

            sourcesSection.style.display =
                "none";
        }


        // ----------------------------------------------------
        // DISPLAY CITATIONS
        // ----------------------------------------------------

        if (
            data.citations &&
            data.citations.length > 0
        ) {

            const seen =
                new Set();


            data.citations.forEach(
                function(
                    citation,
                    index
                ) {

                    const sourceText =
                        citation.text ||
                        "";


                    // Avoid duplicate sources
                    if (
                        !sourceText ||
                        seen.has(
                            sourceText
                        )
                    ) {

                        return;
                    }


                    seen.add(
                        sourceText
                    );


                    // Create source
                    const source =
                        document.createElement(
                            "div"
                        );


                    source.className =
                        "source";


                    // Source title
                    const title =
                        document.createElement(
                            "div"
                        );


                    title.className =
                        "source-title";


                    title.textContent =
                        "Source " +
                        (index + 1);


                    // Source text
                    const text =
                        document.createElement(
                            "div"
                        );


                    text.className =
                        "source-text";


                    text.textContent =
                        sourceText;


                    source.appendChild(
                        title
                    );


                    source.appendChild(
                        text
                    );


                    if (sources) {

                        sources.appendChild(
                            source
                        );
                    }
                }
            );


            // Show sources
            if (sourcesSection) {

                sourcesSection.style.display =
                    "block";
            }
        }


        // Clear question
        questionInput.value = "";


    } catch (error) {

        console.error(
            "Question error:",
            error
        );


        if (loadingMessage) {

            loadingMessage.textContent =
                error.message;
        }
    }


    finally {

        // Enable button
        if (askButton) {

            askButton.disabled =
                false;

            askButton.textContent =
                "Ask Question";
        }
    }
}



// ============================================================
// CLEAR CHAT
// ============================================================

function clearChat() {

    const chatMessages =
        document.getElementById(
            "chatMessages"
        );


    const sourcesSection =
        document.getElementById(
            "sourcesSection"
        );


    const sources =
        document.getElementById(
            "sources"
        );


    const questionInput =
        document.getElementById(
            "questionInput"
        );


    // Clear messages
    if (chatMessages) {

        chatMessages.innerHTML = `

            <div class="welcome-message">

                <div class="welcome-icon">
                </div>

                <h2>
                    Welcome to NotebookLM Clone
                </h2>

                <p>
                    Upload a document and ask
                    questions about it.
                </p>

            </div>

        `;
    }


    // Clear sources
    if (sources) {

        sources.innerHTML =
            "";
    }


    // Hide sources
    if (sourcesSection) {

        sourcesSection.style.display =
            "none";
    }


    // Clear question
    if (questionInput) {

        questionInput.value =
            "";
    }
}



// ============================================================
// LOAD DOCUMENTS FROM S3
// ============================================================

async function loadDocuments() {

    const documentList =
        document.getElementById(
            "documentList"
        );


    const documentCount =
        document.getElementById(
            "documentCount"
        );


    try {

        const response =
            await fetch(
                API_URL + "/documents"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to load documents."
            );
        }


        // ----------------------------------------------------
        // UPDATE COUNT
        // ----------------------------------------------------

        if (documentCount) {

            documentCount.textContent =
                data.count;
        }


        // ----------------------------------------------------
        // CLEAR CURRENT LIST
        // ----------------------------------------------------

        if (documentList) {

            documentList.innerHTML =
                "";
        }


        // ----------------------------------------------------
        // NO DOCUMENTS
        // ----------------------------------------------------

        if (
            data.documents.length === 0
        ) {

            if (documentList) {

                documentList.innerHTML = `

                    <div class="empty-documents">

                        <div class="empty-icon">
                            📄
                        </div>

                        <p>
                            No documents uploaded yet.
                        </p>

                    </div>

                `;
            }

            return;
        }


        // ----------------------------------------------------
        // ADD DOCUMENTS
        // ----------------------------------------------------

        data.documents.forEach(
            function(doc) {

                const documentItem =
                    document.createElement(
                        "div"
                    );


                documentItem.className =
                    "document-item";


                documentItem.textContent =
                    doc.filename;


                documentItem.dataset.filename =
                    doc.filename;


                // ------------------------------------------------
                // CLICK DOCUMENT
                // ------------------------------------------------

                documentItem.addEventListener(
                    "click",
                    function() {

                        selectDocument(
                            documentItem,
                            doc.filename
                        );
                    }
                );


                documentList.appendChild(
                    documentItem
                );
            }
        );


    } catch (error) {

        console.error(
            "Failed to load documents:",
            error
        );
    }
}



// ============================================================
// LOAD DOCUMENTS WHEN PAGE OPENS
// ============================================================

loadDocuments();