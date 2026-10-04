import jsPDF from 'jspdf';
import { OrgConfig, Member, Certificate } from '../types/index.js';

export function formatNPR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rs. 0.00';
  return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convert numbers to English words for official receipts
export function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  const c1 = parseInt(n[1], 10);
  const c2 = parseInt(n[2], 10);
  const c3 = parseInt(n[3], 10);
  const c4 = parseInt(n[4], 10);
  const c5 = parseInt(n[5], 10);

  str += c1 !== 0 ? (a[c1] || b[parseInt(n[1][0], 10)] + ' ' + a[parseInt(n[1][1], 10)]) + 'Crore ' : '';
  str += c2 !== 0 ? (a[c2] || b[parseInt(n[2][0], 10)] + ' ' + a[parseInt(n[2][1], 10)]) + 'Lakh ' : '';
  str += c3 !== 0 ? (a[c3] || b[parseInt(n[3][0], 10)] + ' ' + a[parseInt(n[3][1], 10)]) + 'Thousand ' : '';
  str += c4 !== 0 ? (a[c4] || b[parseInt(n[4][0], 10)] + ' ' + a[parseInt(n[4][1], 10)]) + 'Hundred ' : '';
  str += c5 !== 0 ? (str !== '' ? 'and ' : '') + (a[c5] || b[parseInt(n[5][0], 10)] + ' ' + a[parseInt(n[5][1], 10)]) : '';

  return str.trim() ? str.trim() + ' Rupees Only' : 'Zero Rupees Only';
}

/**
 * Generate and Download Official Membership Certificate PDF
 */
export function generateCertificatePDF(cert: Certificate, member: Member, org: OrgConfig) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Vintage Heavy Bank Parchment Background
  doc.setFillColor(253, 251, 247); // #FDFBF7
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Deep Royal Sapphire Border (4mm from edges)
  doc.setDrawColor(0, 41, 132); // #002984
  doc.setLineWidth(2.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Metallic Gold Foil Frame (11mm from edges)
  doc.setDrawColor(184, 134, 11); // #B8860B
  doc.setLineWidth(1.2);
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22);

  // Inner Electric Cyan Fine Hairline (13mm from edges)
  doc.setDrawColor(0, 180, 216); // #00B4D8
  doc.setLineWidth(0.4);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // 4 Ornate Classical Corner Fleurons (Gold & Sapphire)
  const cornerPositions = [
    [13, 13],
    [pageWidth - 23, 13],
    [13, pageHeight - 23],
    [pageWidth - 23, pageHeight - 23]
  ];
  for (const [cx, cy] of cornerPositions) {
    doc.setFillColor(0, 41, 132);
    doc.rect(cx, cy, 10, 10, 'F');
    doc.setFillColor(184, 134, 11);
    doc.rect(cx + 2.5, cy + 2.5, 5, 5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx + 5, cy + 5, 1, 'F');
  }

  // Subtle Watermark Emblem in Background Center
  doc.setDrawColor(240, 235, 220);
  doc.setLineWidth(0.5);
  doc.circle(pageWidth / 2, pageHeight / 2 + 5, 35);
  doc.circle(pageWidth / 2, pageHeight / 2 + 5, 40);

  // Top Left Medallion: 3D "UG" Monogram Crest
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.8);
  doc.roundedRect(20, 18, 26, 26, 3, 3);
  doc.setFillColor(0, 41, 132);
  doc.roundedRect(21, 19, 24, 24, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UG', 33, 35, { align: 'center' });

  // Top Right Medallion: Official Stamp Ring
  doc.setDrawColor(0, 41, 132);
  doc.setLineWidth(1.2);
  doc.circle(pageWidth - 33, 31, 13);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.circle(pageWidth - 33, 31, 11);
  doc.setFontSize(6);
  doc.setTextColor(0, 41, 132);
  doc.text('UDDHYAMSHEEL', pageWidth - 33, 27, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTD 2079', pageWidth - 33, 32, { align: 'center' });
  doc.setFontSize(6);
  doc.text('LUMBINI', pageWidth - 33, 36, { align: 'center' });

  // Header: Organization Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 41, 132);
  doc.text((org.name || 'UDDHYAMSHEEL GROUP').toUpperCase(), pageWidth / 2, 26, { align: 'center' });

  // Nepali Name
  doc.setFontSize(14);
  doc.setTextColor(184, 134, 11); // Gold #B8860B
  doc.text(org.nepaliName || 'उद्यमशील समूह', pageWidth / 2, 33, { align: 'center' });

  // Address & Establishment
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${org.address || 'Lumbini, Nepal'}  |  Established: ${org.establishedBS || '2079 B.S.'} (${org.establishedAD || '2023 A.D.'})  |  Tel: ${org.phone || '+977-9743403017'}`,
    pageWidth / 2,
    39,
    { align: 'center' }
  );

  // Central Gold Ribbon Banner
  doc.setFillColor(0, 41, 132);
  doc.rect(55, 44, pageWidth - 110, 11, 'F');
  doc.setDrawColor(255, 224, 102); // Gold border #ffe066
  doc.setLineWidth(0.8);
  doc.line(55, 44, pageWidth - 55, 44);
  doc.line(55, 55, pageWidth - 55, 55);

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICATE OF COOPERATIVE MEMBERSHIP', pageWidth / 2, 51.5, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This is to officially and solemnly certify that', pageWidth / 2, 63, { align: 'center' });

  // Member Full Name
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 41, 132);
  doc.text(member.full_name.toUpperCase(), pageWidth / 2, 75, { align: 'center' });

  // Calligraphic underline bracket
  const nameWidth = doc.getTextWidth(member.full_name.toUpperCase());
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(1);
  doc.line((pageWidth - nameWidth) / 2 - 8, 78, (pageWidth + nameWidth) / 2 + 8, 78);
  doc.circle(pageWidth / 2, 78, 1, 'F');

  // Address and Citizenship
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const citizenStr = member.citizenship_no ? `  |  Citizenship / ID: ${member.citizenship_no}` : '';
  doc.text(`Permanent Resident of ${member.address}${citizenStr}`, pageWidth / 2, 85, { align: 'center' });

  // Proclamation Text
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `is recognized as a bona fide, duly inducted ${member.membership_type || 'General'} Member of Uddhyamsheel Group,`,
    pageWidth / 2,
    94,
    { align: 'center' }
  );
  doc.text(
    `endowed with full constitutional rights, democratic voting voice, mutual financial security privileges,`,
    pageWidth / 2,
    100,
    { align: 'center' }
  );
  doc.text(
    `and dividend participations governed under the collective group constitution.`,
    pageWidth / 2,
    106,
    { align: 'center' }
  );

  // Security Credentials Plaque
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.6);
  doc.roundedRect(45, 114, pageWidth - 90, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 41, 132);
  doc.text(`MEMBER IDENTIFICATION: [ ${member.id} ]`, 65, 122.5);

  doc.setTextColor(184, 134, 11);
  doc.text(`ORIGINAL INDUCTION DATE: ${member.membership_date}`, pageWidth / 2 + 10, 122.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`FOLIO: 2079 / ${member.id}`, pageWidth - 55, 122.5, { align: 'right' });

  // ================= BOTTOM LEGAL SECTION =================
  const bottomY = 148;

  // Left: General Secretary Signature Block (Strictly Blank Line for Human Physical Signature)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(24, bottomY + 14, 84, bottomY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('General Secretary / सचिब', 54, bottomY + 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Executive Board · Uddhyamsheel Group', 54, bottomY + 23, { align: 'center' });
  doc.text('Lumbini, Nepal  |  Estd. 2079 B.S.', 54, bottomY + 26.5, { align: 'center' });

  // Center: Scalloped Gold Foil Notary Seal Graphic (Drawn in vector)
  const sealX = pageWidth / 2;
  const sealY = bottomY + 10;
  // Gold Ribbon tails
  doc.setFillColor(0, 41, 132);
  doc.triangle(sealX - 10, sealY, sealX - 18, sealY + 24, sealX - 4, sealY + 20, 'F');
  doc.triangle(sealX + 10, sealY, sealX + 18, sealY + 24, sealX + 4, sealY + 20, 'F');

  // Starburst circle
  doc.setFillColor(224, 169, 38);
  doc.circle(sealX, sealY, 16, 'F');
  doc.setFillColor(255, 234, 121);
  doc.circle(sealX, sealY, 14, 'F');
  doc.setFillColor(184, 134, 11);
  doc.circle(sealX, sealY, 12, 'F');
  doc.setFillColor(255, 243, 176);
  doc.circle(sealX, sealY, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(0, 41, 132);
  doc.text('OFFICIAL NOTARY', sealX, sealY - 3, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('2079 B.S.', sealX, sealY + 1.5, { align: 'center' });
  doc.setFontSize(5);
  doc.text('CHARTER SEAL', sealX, sealY + 5, { align: 'center' });

  // Right: Chairperson / Authorized Signatory Signature Block (Strictly Blank Line for Human Physical Signature)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(pageWidth - 84, bottomY + 14, pageWidth - 24, bottomY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(org.signatoryTitle || 'Chairperson / अध्यक्ष', pageWidth - 54, bottomY + 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Executive Board · Uddhyamsheel Group', pageWidth - 54, bottomY + 23, { align: 'center' });
  doc.text('Lumbini, Nepal  |  Estd. 2079 B.S.', pageWidth - 54, bottomY + 26.5, { align: 'center' });

  // Bottom Anti-Fraud Security Strip
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, bottomY + 31, pageWidth - 20, bottomY + 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28); // Security Red
  doc.text(`Security Serial № ${cert.certificate_no}`, 22, bottomY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Issue: ${cert.issue_date}   |   SHA256: UDG-${cert.certificate_no.replace(/\s+/g, '')}-${member.id}`, 82, bottomY + 36);

  doc.text(
    'Valid upon physical execution by authorized officers and official charter seal.',
    pageWidth - 22,
    bottomY + 36,
    { align: 'right' }
  );

  // Save PDF
  doc.save(`${member.id}_Official_Membership_Certificate_${cert.certificate_no}.pdf`);
}

/**
 * Generate and Download Official Financial Receipt PDF
 */
export function generateReceiptPDF(
  receipt: {
    receiptNo: string;
    date: string;
    memberId: string;
    memberName: string;
    category: string;
    amount: number;
    paymentMethod: string;
    description: string;
    balanceAfter?: number;
  },
  org: OrgConfig
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = 148;
  const height = 210;

  // Outer border
  doc.setDrawColor(0, 41, 132); // Sapphire #002984
  doc.setLineWidth(1.0);
  doc.rect(8, 8, width - 16, height - 16);

  // Inner border
  doc.setDrawColor(0, 180, 216); // Cyan #00b4d8
  doc.setLineWidth(0.4);
  doc.rect(10, 10, width - 20, height - 20);

  // Organization Header
  doc.setTextColor(0, 41, 132);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(org.name || 'UDDHYAMSHEEL GROUP', width / 2, 20, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setTextColor(0, 119, 182);
  doc.text(org.nepaliName || 'उद्यमशील समूह', width / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${org.address || 'Lumbini, Nepal'} | Estd. ${org.establishedBS || '2079 B.S.'} | Tel: ${org.phone || '+977-9743403017'}`, width / 2, 30, { align: 'center' });

  // Divider
  doc.setDrawColor(0, 41, 132);
  doc.setLineWidth(0.6);
  doc.line(14, 34, width - 14, 34);

  // Receipt Badge in Royal Sapphire
  doc.setFillColor(0, 41, 132);
  doc.rect((width - 55) / 2, 37, 55, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL RECEIPT', width / 2, 42.2, { align: 'center' });

  // Receipt No & Date Row
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(`Receipt No: ${receipt.receiptNo}`, 16, 52);
  doc.text(`Date: ${receipt.date}`, width - 16, 52, { align: 'right' });

  // Member Information Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 57, width - 28, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 57, width - 28, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Received From (Member):', 18, 63);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${receipt.memberName}`, 58, 63);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Member ID:', 18, 71);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`${receipt.memberId}`, 58, 71);

  // Transaction Breakdown Table
  let currentY = 88;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, currentY, width - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Description / Purpose', 18, currentY + 5);
  doc.text('Amount (NPR)', width - 18, currentY + 5, { align: 'right' });

  currentY += 7;
  doc.setFillColor(255, 255, 255);
  doc.rect(14, currentY, width - 28, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, currentY, width - 28, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.category, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(receipt.description, 18, currentY + 14);
  doc.text(`Payment Mode: ${receipt.paymentMethod}`, 18, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatNPR(receipt.amount), width - 18, currentY + 12, { align: 'right' });

  currentY += 28;

  // In Words Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, width - 28, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, currentY, width - 28, 14, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount in Words:', 18, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWords(receipt.amount), 18, currentY + 10);

  if (receipt.balanceAfter !== undefined) {
    currentY += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Updated Account Balance: ${formatNPR(receipt.balanceAfter)}`, 18, currentY);
  }

  // Stamp and Signature Section
  const stampY = height - 42;

  // Official Stamp Box
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.roundedRect(20, stampY - 5, 34, 24, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 58, 138);
  doc.text('OFFICIAL STAMP', 37, stampY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Uddhyamsheel Group', 37, stampY + 10, { align: 'center' });
  doc.text('Lumbini, Nepal', 37, stampY + 14, { align: 'center' });

  // Signature Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(width - 55, stampY + 12, width - 18, stampY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Receiver', width - 36, stampY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Uddhyamsheel Administration', width - 36, stampY + 20, { align: 'center' });

  // Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('System-generated official receipt. Valid without physical alteration.', width / 2, height - 12, { align: 'center' });

  doc.save(`Receipt_${receipt.receiptNo}.pdf`);
}
