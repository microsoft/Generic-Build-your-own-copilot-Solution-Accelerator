import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessageContainer } from './ChatMessageContainer';
import { ChatMessage, Citation,ChatType } from '../../../api/models';
import { Answer } from '../../../components/Answer';

jest.mock('../../../components/Answer', () => ({
    Answer: jest.fn((props: any) => <div>
        <p>{props.answer.answer}</p>
        <span>Mock Answer Component</span>
        {props.answer.answer  == 'Generating answer...' ?
        <button onClick={() => props.onCitationClicked()}>Mock Citation Loading</button>        :
        <button onClick={() => props.onCitationClicked({ title: 'Test Citation' })}>Mock Citation</button>
        }
        
    </div>)
}));

const mockOnShowCitation = jest.fn();

describe('ChatMessageContainer', () => {

    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    

    const userMessage: ChatMessage = {
        role: 'user',
        content: 'User message',
        id: '1',
        feedback: undefined,
        date: new Date().toDateString()
    };

    const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Assistant message',
        id: '2',
        feedback: undefined,
        date: new Date().toDateString()
    };

    const errorMessage: ChatMessage = {
        role: 'error',
        content: 'Error message',
        id: '3',
        feedback: undefined,
        date: new Date().toDateString()
    };

    const templateMessage  = [
        {
            "id": "dc79a941-c6c4-a0bb-081f-352e26b6be45",
            "role": "user",
            "content": "Generate promissory note with a proposed $100,000 for Washington State",
            "date": "2024-11-07T09:37:18.146Z"
        },
        {
            "content": "{\"citations\": [{\"content\": \"PROMISSORY NOTE\\nPrincipal Amount and Date: $10,000.00 June 1, 2022\\nBorrower Information: Name: John Smith Address: 123 Main Street, Anytown, USA\\nPayee Information: Name: Jane Johnson Address: 456 Oak Avenue, Otherville, USA\\nInterest Rate: Annual interest rate: 5.0%\\nPayment Terms: The principal and interest shall be due and payable in monthly installments of $500.00, starting on July 1, 2022. The last payment shall be due on May 1, 2023.\\nPrepayment: The Borrower may prepay the outstanding balance, in part or in full, at any time without penalty.\\nDefault: If the Borrower fails to make any payment within 30 days of its due date, it shall be considered a default.\\nNotices:\\nAll notices, requests, demands, and other communications required or permitted under this Promissory Note shall be in writing and shall be deemed to have been duly given when personally delivered or sent by certified mail to the addresses provided above.\\nJurisdiction and Waivers:\\nThis Promissory Note shall be governed by and construed in accordance with the laws of the State of [insert state]. The Borrower and Payee irrevocably submit to the exclusive jurisdiction of the courts of [insert city], [insert state] for the resolution of any disputes arising under or in connection with this Promissory Note.\\nCumulative Remedies:\\nNo delay or omission in the exercise of any right, power, or remedy accruing to the Payee upon any breach or default under this Promissory Note shall impair any such right, power, or remedy, nor shall it be construed to be a waiver of any such breach or default.\\nWaivers by Borrower: The Borrower waives the presentment for payment, protest, notice of protest, notice of dishonor, and all other notices or demands of any kind, except as expressly provided in this Promissory Note.\\nAmendments:\\nNo modification, amendment, or waiver of any provision of this Promissory Note shall be effective unless in writing and signed by both the Borrower and Payee.\\nAssignment: The Payee may assign, transfer, or sell this Promissory Note to any third party without the Borrower's consent\", \"title\": \"PROMISSORY NOTE\", \"url\": null, \"filepath\": \"PromissoryNote_20240730144844.pdf\", \"chunk_id\": \"0\"}, {\"content\": \"PROMISSORY NOTE\\nPrincipal Amount and Date: $10,000.00 Date: [Insert Date]\\nBorrower: Name: John Doe Address: 1234 Main Street, Anytown, USA\\nPayee: Name: Jane Smith Address: 5678 Elm Street, Anycity, USA\\nInterest Rate: The Borrower shall pay interest on the outstanding principal amount at a fixed interest rate of 5% per annum.\\nPayment Terms: The Principal and interest shall be repaid in [Insert number of installments] equal monthly installments of $[Insert amount] each, starting from [Insert Date]. The final payment will be made on [Insert Date]. All payments shall be made by check or electronic transfer to the Payee.\\nPrepayment: The Borrower has the right to prepay the principal amount in full or in part, at any time, without any prepayment penalty.\\nDefault: In the event of default, the Payee may demand immediate payment of the entire outstanding principal amount, together with accrued interest and any other costs or expenses incurred as a result of the default. A default may include failure to make payments, breach of any other term in this Promissory Note, or insolvency of the Borrower.\\nNotices: All notices regarding this Promissory Note shall be in writing and sent to the parties at their respective addresses mentioned herein or to any other address as notified in writing.\\nJurisdiction and Waivers:\\nAny disputes arising from or related to this Promissory Note shall be resolved under the jurisdiction of the state courts located in [Insert State]. The parties hereby waive any right to a trial by jury.\\nCumulative Remedies:\\nAll remedies available under this Promissory Note shall be cumulative and in addition to any other remedies available at law or in equity.\\nWaivers by Borrower:\\nThe Borrower waives presentment, demand for payment, notice of dishonor, protest, and any other notice or requirement.\\nAmendments:\\nAny amendments or modifications to this Promissory Note shall be in writing and signed by both parties.\\nAssignment:\\nThe Payee may assign, transfer, or sell this Promissory Note, in whole or in part, to any person or entity without the Borrower's consent.\\nGoverning Law: The laws of [Insert State] shall govern this Promissory Note\", \"title\": \"PROMISSORY NOTE\", \"url\": null, \"filepath\": \"PromissoryNote_20240730144851.pdf\", \"chunk_id\": \"0\"}, {\"content\": \"Promissory Note\\nPrincipal Amount and Date: $10,000.00 Date: June 1, 2022\\nBorrower: Name: John Doe Address: 123 Main Street, Anytown, USA\\nPayee:\\nName: Jane Smith\\nAddress: 456 Elm Street, Other City, USA\\nInterest Rate:\\nAnnual interest rate: 5%\\nPayment Terms: The Borrower shall make monthly installment payments of $250.00 on the 1st day of each month, starting from July 1, 2022. The payments shall be applied first towards accrued interest and then towards the outstanding principal amount.\\nPrepayment: The Borrower may prepay the outstanding principal amount, in full or in part, at any time without incurring any prepayment penalties or charges.\\nDefault: In the event of default, the Payee shall have the right to declare the entire outstanding principal and accrued interest immediately due and payable. Default includes failure to make any payment within 30 days of its due date, insolvency, bankruptcy, or breach of any provision of this Promissory Note.\\nNotices: All notices or communications under this Promissory Note shall be in writing and sent to the respective parties' addresses mentioned above or to any other address provided in writing.\\nJurisdiction and Waivers: Both parties agree that any legal disputes arising from this Promissory Note shall be subject to the jurisdiction of the courts located in the State of California. The Borrower waives any objections to jurisdiction, venue, or inconvenience of these courts.\\nCumulative Remedies:\\nAll rights and remedies available to the Payee under this Promissory Note shall be cumulative and not exclusive of any other rights or remedies provided by law.\\nWaivers by Borrower: The Borrower waives the right to presentment, notice of dishonor, protest, and any other notice or demand.\\nAmendments: Any modifications or amendments to this Promissory Note must be made in writing and signed by both parties.\\nAssignment: The Payee may assign their rights and obligations under this Promissory Note to any third party without the Borrower's consent.\\nGoverning Law:\\nThis Promissory Note shall be governed by and construed in accordance with the laws of the State of California\", \"title\": \"Promissory Note\", \"url\": null, \"filepath\": \"PromissoryNote_20240730144717.pdf\", \"chunk_id\": \"1\"}, {\"content\": \". The Borrower hereby consents to the jurisdiction of the state and federal courts located in the State of [State] for any action, suit, or proceeding arising out of or relating to this Promissory Note.\\nCumulative Remedies:\\nThe remedies provided in this Promissory Note shall be cumulative and in addition to any other remedies available at law or in equity.\\nWaivers by Borrower:\\nThe Borrower waives presentment, demand for payment, protest, and notice of any default, nonpayment, or dishonor, whether before or after acceleration of the Principal Amount.\\nAmendments: Any amendment or modification to this Promissory Note shall be valid only if it is in writing and signed by both the Borrower and the Payee.\\nAssignment: The Payee may assign this Promissory Note, in whole or in part, to any person or entity without the Borrower's consent. Governing Law: This Promissory Note shall be governed by and interpreted in accordance with the laws of the State of [State].\\nSignatures:\\nBorrower:\\n(signature) John Doe\\nLender:\\n(signature) Jane Smith\\nBorrower's Address: 123 Main Street, [City], [State], [ZIP]\", \"title\": \"PROMISSORY NOTE\", \"url\": null, \"filepath\": \"PromissoryNote_20240730144811.pdf\", \"chunk_id\": \"0\"}, {\"content\": \". The rights and remedies under this Promissory Note are cumulative and not exclusive of any other rights or remedies provided by law.\\nWaivers by Borrower: The Borrower waives notice of presentment, demand for payment, protest, and notice of protest of this Promissory Note.\\nAmendments:\\nNo amendment or modification of this Promissory Note shall be binding unless it is in writing and signed by both the Borrower and the Payee.\\nAssignment: The Payee may assign, transfer, or otherwise convey its rights, title, and interest in this Promissory Note to any third party without obtaining the Borrower's consent. Governing Law: This Promissory Note shall be governed by and construed in accordance with the laws of the State of [State].\\nSignatures:\\nBorrower: John Doe Date\\nPayee: Jane Smith Date Borrower's Address: 123 Main Street Cityville, State 12345\", \"title\": \"PROMISSORY NOTE\", \"url\": null, \"filepath\": \"PromissoryNote_20240730144824.pdf\", \"chunk_id\": \"0\"}], \"intent\": \"[\\\"Generate promissory note template for $100,000 in Washington State\\\", \\\"How to create a promissory note for $100,000 in Washington State\\\", \\\"Washington State promissory note template for $100,000\\\"]\"}",
            "role": "tool",
            "id": "d0b24334-ef2a-45e8-863f-4ec221b2454f",
            "date": "2024-11-07T09:37:30.581Z"
        },
        {
            "content": "{\"template\": [{\"section_title\": \"Principal Amount and Date\", \"section_description\": \"Principal Amount: $100,000.00\\nDate: [Insert Date]\"}, {\"section_title\": \"Borrower Information\", \"section_description\": \"Name: [Insert Borrower's Name]\\nAddress: [Insert Borrower's Address]\"}, {\"section_title\": \"Payee Information\", \"section_description\": \"Name: [Insert Payee's Name]\\nAddress: [Insert Payee's Address]\"}, {\"section_title\": \"Interest Rate\", \"section_description\": \"The Borrower shall pay interest on the outstanding principal amount at a fixed interest rate of 5% per annum.\"}, {\"section_title\": \"Payment Terms\", \"section_description\": \"The Principal and interest shall be repaid in [Insert number of installments] equal monthly installments of $[Insert amount] each, starting from [Insert Date]. The final payment will be made on [Insert Date]. All payments shall be made by check or electronic transfer to the Payee.\"}, {\"section_title\": \"Prepayment\", \"section_description\": \"The Borrower has the right to prepay the principal amount in full or in part, at any time, without any prepayment penalty.\"}, {\"section_title\": \"Default\", \"section_description\": \"In the event of default, the Payee may demand immediate payment of the entire outstanding principal amount, together with accrued interest and any other costs or expenses incurred as a result of the default. A default may include failure to make payments, breach of any other term in this Promissory Note, or insolvency of the Borrower.\"}, {\"section_title\": \"Notices\", \"section_description\": \"All notices regarding this Promissory Note shall be in writing and sent to the parties at their respective addresses mentioned herein or to any other address as notified in writing.\"}, {\"section_title\": \"Jurisdiction and Waivers\", \"section_description\": \"Any disputes arising from or related to this Promissory Note shall be resolved under the jurisdiction of the state courts located in Washington State. The parties hereby waive any right to a trial by jury.\"}, {\"section_title\": \"Cumulative Remedies\", \"section_description\": \"All remedies available under this Promissory Note shall be cumulative and in addition to any other remedies available at law or in equity.\"}, {\"section_title\": \"Waivers by Borrower\", \"section_description\": \"The Borrower waives presentment, demand for payment, notice of dishonor, protest, and any other notice or requirement.\"}, {\"section_title\": \"Amendments\", \"section_description\": \"Any amendments or modifications to this Promissory Note shall be in writing and signed by both parties.\"}, {\"section_title\": \"Assignment\", \"section_description\": \"The Payee may assign, transfer, or sell this Promissory Note, in whole or in part, to any person or entity without the Borrower's consent.\"}, {\"section_title\": \"Governing Law\", \"section_description\": \"The laws of Washington State shall govern this Promissory Note.\"}, {\"section_title\": \"Signatures\", \"section_description\": \"Borrower: [Insert Borrower's Name] Date\\nPayee: [Insert Payee's Name] Date\\nBorrower's Address: [Insert Borrower's Address]\"}]}",
            "role": "assistant",
            "id": "d0b24334-ef2a-45e8-863f-4ec221b2454f",
            "date": "2024-11-07T09:37:30.581Z"
        },

    ]

    it('renders user and assistant messages correctly', () => {
        render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                isLoading={false}
                showLoadingMessage={false}
                type ={ChatType.Browse}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Check if user message is displayed
        expect(screen.getByText('User message')).toBeInTheDocument();

        // Check if assistant message is displayed via Answer component
        expect(screen.getByText('Mock Answer Component')).toBeInTheDocument();
        expect(Answer).toHaveBeenCalledWith(
            expect.objectContaining({
                answer: {
                    answer: 'Assistant message',
                    citations: [], // No citations since this is the first message
                    message_id: '2',
                    feedback: undefined
                }
            }),
            {}
        );
    });

    it('renders an error message correctly', () => {
        render(
            <ChatMessageContainer
                messages={[errorMessage]}
                isLoading={false}
                showLoadingMessage={false}
                type ={ChatType.Browse}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Check if error message is displayed with the error icon
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('displays the loading message when showLoadingMessage is true', () => {
        render(
            <ChatMessageContainer
                messages={[]}
                isLoading={false}
                showLoadingMessage={true}
                type ={ChatType.Browse}
                onShowCitation={mockOnShowCitation}
            />
        );
        // Check if the loading message is displayed via Answer component
        expect(screen.getByText('Generating answer...')).toBeInTheDocument();
    });

    it('calls onShowCitation when a citation is clicked', () => {
        render(
            <ChatMessageContainer
                messages={[assistantMessage]}
                isLoading={false}
                showLoadingMessage={false}
                type ={ChatType.Browse}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Simulate a citation click
        const citationButton = screen.getByText('Mock Citation');
        fireEvent.click(citationButton);

        // Check if onShowCitation is called with the correct argument
        expect(mockOnShowCitation).toHaveBeenCalledWith({ title: 'Test Citation' });
    });

    it('does not call onShowCitation when citation click is a no-op', () => {
        render(
            <ChatMessageContainer
                messages={[]}
                isLoading={false}
                showLoadingMessage={true}
                type ={ChatType.Browse}
                onShowCitation={mockOnShowCitation} // No-op function
            />
        );
        // Simulate a citation click
        const citationButton = screen.getByRole('button', {name : 'Mock Citation Loading'});
        fireEvent.click(citationButton);

        // Check if onShowCitation is NOT called
        expect(mockOnShowCitation).not.toHaveBeenCalled();
    });


    it('Should handle template generation error when we pass chat type as template and not pass any template', () => {
        render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                isLoading={false}
                showLoadingMessage={true}
                type ={ChatType.Template}
                onShowCitation={mockOnShowCitation} // No-op function
            />
        );
        expect(screen.getByText(/Generating template...this may take up to 30 seconds./)).toBeInTheDocument();
        expect(screen.getByText(/I was unable to find content related to your query and could not generate a template. Please try again/)).toBeInTheDocument();
        
    });

    it.skip('Should handle template generation error when we pass chat type as template and pass template', () => {
        render(
            <ChatMessageContainer
                messages={[...templateMessage]}
                isLoading={false}
                showLoadingMessage={true}
                type ={ChatType.Template}
                onShowCitation={mockOnShowCitation} // No-op function
            />
        );
        expect(screen.getByText(/Generating template...this may take up to 30 seconds./)).toBeInTheDocument();
        expect(screen.getByText(/Generate promissory note with a proposed $100,000 for Washington State/)).toBeInTheDocument();
    });
});
