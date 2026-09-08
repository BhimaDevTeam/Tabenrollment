import { COLLECTION_API } from "../apiurl";

const fromBase64 = (value) => {
	try {
		return decodeURIComponent(atob(value));
	} catch {
		return value;
	}
};

const toBase64 = (value) => {
	return btoa(encodeURIComponent(value));
};

// ─── Singapore branch codes — always valid, no DB lookup needed ───────────────
const SINGAPORE_BRANCHES = ["LN", "LI"];

export const fetchBranchDataFunc = async (branch) => {
	try {
		const branchUpper = (branch || "").toUpperCase().trim();

		// Also try decoding Base64 — TE4= decodes to LN
		let decodedUpper = branchUpper;
		try {
			decodedUpper = decodeURIComponent(atob(branch)).toUpperCase().trim();
		} catch {}

		// Singapore branches are always valid — skip India DB lookup
		if (SINGAPORE_BRANCHES.includes(branchUpper) || SINGAPORE_BRANCHES.includes(decodedUpper)) {
			return true;
		}

		const response = await fetch(
			`${COLLECTION_API}/branchdetails`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}

		const responseData = await response.json();

		// Check query params for branch
		const branchFromParams = branch;

		if (branchFromParams) {
			let branchExists = null;
			if (responseData) {
				const CheckBranch = responseData.find(
					(r) => r.Branch_Code === branchFromParams
				);
				if (CheckBranch) branchExists = CheckBranch.Branch_Code;
				else branchExists = fromBase64(branchFromParams);
			}

			// Set the branch if it exists in the fetched branch data
			const isValidBranch = responseData.filter(
				(branch) => branch.Branch_Code === branchExists
			);

			if (isValidBranch.length) {
				return true;
			}
			return false;
		}
	} catch (error) {
		console.error("Error fetching branch data:", error);
	}
};
