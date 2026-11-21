// src/Pages/modules/operations/i18n/en.js
import { EXPORT_STATUS_SEQUENCE, IMPORT_STATUS_SEQUENCE_B, EXCEPTION_STATUSES } from '../constants/shipmentStatus';
import { OPERATIONS_ROLE_LABELS } from '../constants/operationsRoles';

const status = {};
[...EXPORT_STATUS_SEQUENCE, ...IMPORT_STATUS_SEQUENCE_B].forEach((s) => { if (!status[`status.${s.code}`]) status[`status.${s.code}`] = s.label; });
status['status.DOCUMENTS_FORWARDED'] = 'Documents Forwarded to Client';
status['status.SELF_CLEARED'] = 'Client Acknowledged — Self-Cleared';
const exc = Object.fromEntries(EXCEPTION_STATUSES.map((e) => [`exception.${e.code}`, e.label]));
const role = Object.fromEntries(Object.entries(OPERATIONS_ROLE_LABELS).map(([k, v]) => [`role.${k}`, v]));

export default {
  ...status, ...exc, ...role,
  'nav.dashboard': 'Dashboard', 'nav.myTasks': 'My Tasks', 'nav.shipments': 'Shipments', 'nav.newExport': 'New Export', 'nav.newImport': 'New Import',
  'nav.tracking': 'Track Shipment', 'nav.documents': 'Document Center', 'nav.manifests': 'Manifest Register', 'nav.approvals': 'Approval Queue',
  'nav.trackingReview': 'Tracking Review', 'nav.evidence': 'Customs / Airline Evidence', 'nav.closure': 'Closure', 'nav.customers': 'Customer Profile',
  'nav.auditLog': 'Status Update Log', 'nav.assignTasks': 'Assign Tasks', 'nav.hubVerification': 'Hub Verification', 'nav.tradeDocs': 'Documents Upload',
  'nav.notifications': 'Notifications', 'nav.openMenu': 'Open navigation menu', 'nav.collapse': 'Collapse sidebar', 'nav.expand': 'Expand sidebar',
  'common.save': 'Save', 'common.submit': 'Submit', 'common.cancel': 'Cancel', 'common.back': 'Back', 'common.next': 'Next', 'common.search': 'Search',
  'common.view': 'View', 'common.loading': 'Loading...', 'common.noData': 'No data found.', 'common.logout': 'Logout', 'common.myProfile': 'My Profile',
  'common.language': 'Language', 'common.confirm': 'Confirm', 'common.reject': 'Reject', 'common.approve': 'Approve', 'common.comment': 'Comment',
  'common.saveDraft': 'Save Draft', 'common.uploadEvidence': 'Upload Evidence', 'common.discrepancy': 'Discrepancy', 'common.actions': 'Actions',
  'common.date': 'Date', 'common.status': 'Status', 'common.mode': 'Mode', 'common.export': 'Export', 'common.import': 'Import', 'common.required': 'Required',
  'common.remarks': 'Remarks', 'common.upload': 'Upload', 'common.yes': 'Yes', 'common.no': 'No', 'common.welcome': 'Welcome', 'common.details': 'Details',
  'common.operationsModule': 'Operations Module', 'common.login': 'Login', 'common.signingIn': 'Signing in...', 'common.email': 'Email', 'common.password': 'Password',
  'common.quickLogin': 'Quick Login (Demo)', 'common.selectRole': 'Select a role...', 'common.viewAll': 'View All', 'common.noNotifications': 'No notifications right now.',
  'common.notifications': 'Notifications', 'common.markRead': 'Mark as read', 'common.refresh': 'Refresh',
  'field.shipmentId': 'Shipment ID', 'field.principal': 'Principal / Partner', 'field.pickupDate': 'Pickup Arranged For', 'field.pickedAt': 'Actual Pickup Time',
  'field.actualPieces': 'Actual Pieces', 'field.actualWeight': 'Actual Weight (kg)', 'field.dimensions': 'Dimensions (L×W×H)', 'field.condition': 'Parcel Condition',
  'field.warehouseReceiptNo': 'Warehouse Receipt No.', 'field.receivedAt': 'Received At', 'field.trackingNumber': 'Principal Tracking Number', 'field.mawbNo': 'MAWB No.',
  'field.flightNo': 'Flight No.', 'field.flightDate': 'Flight Date', 'field.photos': 'Photos / Evidence', 'field.comments': 'Comments', 'field.nextAction': 'Next Action',
  'field.assignedTo': 'Assigned To', 'field.contents': 'Contents', 'field.declaredPieces': 'Declared Pieces', 'field.supplier': 'Supplier', 'field.address': 'Address',
  'field.contact': 'Contact', 'field.phone': 'Phone', 'field.discrepancyReason': 'Discrepancy Reason', 'field.docsReceived': 'Invoice / Packing List Received',
  'condition.GOOD': 'Good', 'condition.DAMAGED': 'Damaged', 'condition.OPENED': 'Opened', 'condition.OTHER': 'Other',
  'waiting.waitingFor': 'Waiting for', 'waiting.headApproval': 'Waiting for Operations Head Approval', 'waiting.clientConfirm': 'Waiting for Client Confirmation',
  'waiting.api': 'Waiting for Principal Tracking API', 'waiting.inProgress': 'In Progress', 'waiting.completed': 'Completed', 'waiting.stuck': 'Stuck',
  'msg.saved': 'Saved successfully', 'msg.failed': 'Action failed', 'msg.notAssigned': 'This shipment is not assigned to you',
  'msg.requiredMissing': 'Please fill in all required fields', 'msg.apiOutage': 'Principal tracking API is temporarily unavailable',
  'foreign.title': 'Origin Operations', 'foreign.subtitle': 'Record origin-side actuals and evidence for your assigned import shipments.',
  'foreign.noShipments': 'No shipments are assigned to you.', 'foreign.stage.PICKUP_ARRANGED': 'Pickup Arranged', 'foreign.stage.PICKED_UP': 'Picked Up from Shipper',
  'foreign.stage.RECEIVED_AT_ORIGIN_WAREHOUSE': 'Received at Origin Warehouse', 'foreign.stage.EXPORT_CUSTOMS_CLEARANCE': 'Export Customs Cleared',
  'foreign.stage.READY_FOR_DEPARTURE': 'Ready for Departure', 'foreign.stage.DEPARTED_ORIGIN': 'Departed from Origin',
  'foreign.documentPack': 'Ready Document Pack',
  'foreign.mismatchWarn': 'Actual pieces differ from declared pieces — a Short Received / Damaged exception will be raised for review.',
  'foreign.evidenceHint': 'Record the origin export clearance evidence in the Evidence tab. Verified evidence is required before "Ready for Departure".',
  'foreign.dash.subtitle': 'Origin-side operations for your assigned import shipments.',
  'foreign.dash.assigned': 'Assigned Shipments', 'foreign.dash.actionNeeded': 'Needs My Action', 'foreign.dash.inTransit': 'Departed / In Transit', 'foreign.dash.exceptions': 'Open Exceptions',
  'foreign.dash.waitingOnYou': 'Waiting on You', 'foreign.dash.nothing': 'Nothing is waiting on you right now.',
  'foreign.col.shipment': 'Shipment', 'foreign.col.supplier': 'Supplier', 'foreign.col.cargo': 'Cargo', 'foreign.col.status': 'Status', 'foreign.col.nextStage': 'My Next Stage', 'foreign.col.waiting': 'Waiting On',
  'foreign.list.title': 'Assigned Shipments', 'foreign.list.search': 'Search shipment / supplier', 'foreign.list.onlyMine': 'Needs my action', 'foreign.list.showMore': 'Show more', 'foreign.list.empty': 'No shipments match.',
  'foreign.tasks.title': 'My Tasks', 'foreign.tasks.subtitle': 'Shipments currently waiting on your input.',
  'foreign.ws.back': '← All shipments', 'foreign.ws.tab.ops': 'Origin Operations', 'foreign.ws.tab.evidence': 'Evidence', 'foreign.ws.tab.docs': 'Documents', 'foreign.ws.tab.tracking': 'Tracking', 'foreign.ws.progress': 'Progress',
  'foreign.ws.error': 'This shipment could not be loaded, or it is not assigned to you.',
  'foreign.evidence.title': 'Origin Evidence', 'foreign.evidence.subtitle': 'Record origin export clearance, security acceptance or airline handover. The Bangladesh Supervisor verifies it.',
  'foreign.evidence.type': 'Evidence Type', 'foreign.evidence.result': 'Result', 'foreign.evidence.authority': 'Authority / Airline', 'foreign.evidence.reference': 'Reference No.', 'foreign.evidence.eventAt': 'Date-time',
  'foreign.evidence.location': 'Location', 'foreign.evidence.holdReason': 'Hold / Examination Reason', 'foreign.evidence.file': 'Upload signed / stamped file (PDF, JPG, PNG — max 2MB)', 'foreign.evidence.attached': 'Attached:',
  'foreign.evidence.save': 'Save Evidence', 'foreign.evidence.none': 'No evidence recorded yet.', 'foreign.evidence.log': 'Recorded Evidence',
  'evidence.ORIGIN_EXPORT_CLEARANCE': 'Origin Export Clearance', 'evidence.SECURITY_ACCEPTANCE': 'Security Screening / Airline Acceptance', 'evidence.HANDOVER': 'Airline Handover',
  'evidenceResult.SUBMITTED': 'Submitted', 'evidenceResult.ACCEPTED': 'Accepted', 'evidenceResult.REJECTED': 'Rejected', 'evidenceResult.ON_HOLD': 'On Hold',
  'verification.PENDING': 'Pending', 'verification.VERIFIED': 'Verified', 'verification.REJECTED': 'Rejected',
  'doc.INVOICE': 'Commercial Invoice', 'doc.PACKING_LIST': 'Packing List', 'doc.DECLARATION': 'Declaration', 'doc.LABEL': 'Shipping Label', 'doc.AWB': 'Air Waybill (AWB)', 'doc.MANIFEST': 'Manifest',
  'doc.notAvailable': 'Not available yet', 'doc.packHidden': 'The document pack becomes visible once it has been prepared.', 'doc.official': 'Official documents are printed in their approved English templates.',
  'tracking.title': 'Principal Tracking Events', 'tracking.noEvents': 'No tracking events yet.', 'tracking.noNumber': 'Tracking starts after the principal tracking number is recorded.',
  'profile.title': 'My Profile', 'profile.changePassword': 'Change Password', 'profile.current': 'Current Password', 'profile.new': 'New Password', 'profile.confirm': 'Confirm New Password',
  'profile.update': 'Update Password', 'profile.saving': 'Saving...', 'profile.fillAll': 'Fill in all password fields', 'profile.min6': 'New password must be at least 6 characters', 'profile.noMatch': 'New passwords do not match', 'profile.updated': 'Password updated successfully',
  "notif.needsAction": "Needs your action",
  "nav.inbox": "Tasks & Notifications",
};