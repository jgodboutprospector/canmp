/**
 * Script to import donation data from Airtable CSV/TSV export
 *
 * Usage:
 *   npx ts-node scripts/import-donations.ts
 *
 * Or with tsx:
 *   npx tsx scripts/import-donations.ts
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SYNC_API_KEY
 *   - AWS_* credentials (for S3 photo migration)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Raw Airtable data (tab-separated from the export)
const AIRTABLE_DATA = `Item Name	Description	Category	Condition	Photos	Date Donated	Donor	Claimed Status	Claimed By	Item Claims	Number of Claims	Most Recent Claim Date	Claim Statuses	Donor Email	Donor Name	Summary for Shop Display	Suggested Next Action
Table with two chairs		Furniture	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/LQhqr7TW7QDxVMmBi4CGUw/bMJaGRcfJqw01BFm0ceH4ibFXRM885SMWJW6o6BEXFiPc4ok9G9RPkSBmF3IvzxOZx1Gu17DSFHDrGKhGYal0bq6avc6nhyRDWfRdZrQWfvOhAdtRVzsHZ84ETAHJslBIpi0qH-NBITot2nBi0YhBw/kW3_fLxZxKSX8W9J6ibmwsqlRyxTq1HWgWB1rgL7aWg)	12/3/2025
Box of small kitchen utensils 	Tiny coffee maker, bowls, silverware org	Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/JW6y_zG5mdZWQ5-BRVytGQ/1Kg78yPQ_HmVS-qQk8hPlhNSQYeb-TnNrvpsWVBuLBow35DOPBf1RP1N52UBgUpoLv4mrr0lyyrHEdXz1gVRDBxjYu9pOdhacWP3Rds7jMa77JP_aQ1VYDVoBYXL1XFGOk8l1_8wlphB_BBsaD3ITA/nT2rD5lnEtTjJnVobRCbvx8MZlGP3ZD2Pgwa-oIHYS8)			Katya	Unnamed record	1	12/8/2025	Approved
Wall lamp	Three bulb wall lamp	Furniture	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/VmXfraJStJAbKynJJrTs-w/jKrWL-gTHOBjq6aXy-PEmrWkjwtU51oOMkCDECSwpTLZBew_u5DyxnnaqM15mhuYNnlnlME5LQK1C7pQf93vGXbKL2o6K_RBgK6J4fx2b_kz_yHffnq3dtXsUOg1QpwUg8gxrjGXtdI7JSjD5EmiVQ/IFP89nVN-kHy9vH8RznYiWfBLi1QmWvnM7JrtrRETII),image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/x4PGqkcKtHPYl7RfsDqFSQ/Y_b9Mj9Qyh2PXUbIPONhyN18Hsd_I9tlAt0ck410fb6nSAeO5DK0yZPoRrREIbkTemJOHwvPyzj_BdYo2dnkjCBBXMjG5J9XBkn4z8PmcO5-gwR1DCl8pHds_rLZWaGt22lkQA_frdjwAojRSwTAvA/HjzTXwqhK8ty-vHtc_CINW9JYvIXDmkD6gOGdMH9lFM)
Large lamp		Furniture	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/oZdOktn2GNH8LFSsq-cFqg/u68FcqNpztk8Naz7qRogTxMcG9e0fKImIvTqW5t7p3iR9HOUtTKuKHV4xzkpqI_42LKOC8qPVX59m43wJ_IsCpPTcrF1o6zyZ08JuLeHLF3N6sSuoCc6ETHcFd1dntcFglhW1ci3JJBEELvzudjNjg/0Ypd1lIm5trysPBL1I7pW2Ko3cFG21f3Eu6kMzGdnaA)
Large table lamp		Furniture	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/IwW_vFG_GmbcZPYeJdTn0w/L4PvdFiKhO-BK36kdHPoifqkbCux15TrZ8OLMPlU6eWvKkI6RBVwcnA_87_xbirxVtG_pKeKgMkNiQbYCuhut0lzPNUOPXGneCufaQjgIRvRCfS2uR_iAgY7KixOGBFGJQsZ-eque_N5A2ruG18rcg/gjaRDoVosVSAOq7D43uomPUeJFE5SQ-Gw4x0oxlBtmI)
Table lamp		Furniture	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/QstInUGczsldcmjqfkGb1w/YEsYVy0Ky_GbWgioejrUn4LxTKXJ12TiAFREO3Rjlf8sD9Q7pQjkm8t70okw2B9B5C5yMOicvPOf9QYmLJsS4AGFep4lqXwh-XU11YPMbD58J2re6Q7D0v0kZPg81epsqXjCm3UGsAksNJnZ0qA03Q/xt8S0DRYFCB2wV-ZdL95zum91SxAG4xuRRBV1Kl7eIc)
Magazine Rack/wood	Wooden and very solid!	Furniture	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/3kHbgJs-WYGutBEBqX2p9g/APmv1lULaKwXrK20uR5VQbjpvn3jRD4ISXvsYgkTtM5k_RVZ_V0Y547Hmal9O6fLKa_wSc3NY9y0JqWszYZ6sgKq97Jhr4IwiQc4Y1YYlFLURdL5a7QTwhw2y_vF4-V-boYZFM4KC5vKoN2o7vR11Q/hUIlFmPOvRlQtPHjh_PUb4FKE8GzacsOjNVaD87LzR4)
7 coffee mugs and 2 plates	Assorted 	Kitchenware	Gently Used	PXL_20251203_193329853.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/hkZuPVRzh4j5S-1HaQOMMw/j80v-GtZxQz58oFnCDe3cTm2Ii5nYfHnhEjsA2qs6g5SEoKvTeOGxyX_8QymCGA424VkPcSQ2sb4qbC2HCAUZL-J2BrE_FWAcsuhhIdJ64VjUcIMqZirCGQfu2DVCFqJrTJCYzvm04sj4nSO1jOIYSQ-f0UD_QdOjnZWRIrySioMCfiaVx1K0gVf_BdkCO-I/j3R9SyC9oBrw_fRbuVUSeeA8tZ2ohpDrT2M6f8KrpIQ)
Magazine rack	2 sided dark wood in good shape 	Furniture	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/6NewdDwvLZPnuf76RaIndQ/q4LJDTBJWzyd3iWZTn_Az8ivxHjJuSWSyU6TqtGqn7rOKxFWF7gHXuWS9Rl257wmoALI80k9f-w8kZ3wPSwgFFsjuH08F-aTBO9p159Nsvrkfid9zVVSJ1RjUtb4rtPz7YUH8CyB0FdKvtEBZ4DTow/dYzlCmLJkhzB21BjKlyKFpVuwFWj4PqZEYCdTlsL9fc)
Holiday thermos 	Red 	Kitchenware	Gently Used	PXL_20251203_193344435.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/aNLXsALkTvCLrAUyeqkiog/_Ak5MgZKfCmdgsK18s3ASqaW99GDGONOZHtB9Q5RFibsHw--2fnv8rKcpCAXGn7nzwBMpSlMVLe0tWdpKAjpJpsrNVLjQ7yopLLmaYmMZIuSzlv0iN37z_Xxnhh6Wzzt-zRFuCBd6SXvVEskqNXExY45DonqpPsMHPv5D8kGlGd4XO8xTxaU56_r38olX8TO/qR0A6jilNJy5vCxdFSj-n_4_X_2hey67YP5w2lya_mQ)
Car seat	Toddler size	Baby Items	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/uWPeRTukKrNTscjb_DcAkw/bDvLgckpjecWML84gHe_ZK0VSZkMCpgfpOx84h5_HM4OoPpBjkoXI1f7Hz2Cd13ANl22lX64fyOBODtcpXJbV6CUR-HJkU9WSxmICYZHX0IjwCGUss5e5gl7Y3ImV8NtBfuOvnluy1rv1oX9xQu1xA/K-rHul4ZX5J-fm9P1J8wWjWhCIjdOwP09JCbVPVAJm0)
Dental hygiene set	3 brushes, 2 toothpastes, floss	Other	New	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/RVy-DND4hVrWqnlPaou8kw/mg2GwjE0HkMIxbs8OWw9hihSr2AzyrKiQLunNwGSygjmcMkPKxBxXMQ1bLxya-X8OavL7KdYPJLPeWv8l0w6s2MGQeZIg8p0vGBQOTyLAdrkxMNGo3g-362jk3J5aoZFnxtaiebVQ6eU6BRCWiixZw/mnvWaJHURTO50gGE6AkswFkd-bgSX2VFMINDLfV6Dsw)
Microwave 	700 watts 	Kitchenware	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/dNYD_jILOHcSZsTbwHuI9w/uzmbyhvc86Jx8gRyl_LCZ8Zbp6YapNOkh8mn2n9_Mq9TI7BwDmhoZt2L1I76t1a4wikZcGAogRnu7rkLYF4j0KSw1LyR9KQj9sdYpB9H6gghKX_VB6rubrIQLx8YC6HtaRMMSjDBxBFBtPI6skSPuA/QSL_eJs-0OGOM764pN4Vr8w89GUIO5t6C8Be-U07igA)
Rocker Chair, small	Small antique rocker, folding	Furniture	Used	PXL_20251203_194131334.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/VVbtJ67vc4frDVbogp3MUg/jE494PqFxW8y05m614M-HlAl0P3St9xY_e8P7uBjyKu0mt1lBDYCdh_N_MxDxXU8dd9Tx65Wf92Uwvc7klSo4yjH2lyBCVbGEmQ1tS6OPaYOs7EwUOhSPTNvF0bSt6tDhw2CAIWnnoTMC8HfweBmSxkZmao5tIFWkYBoVFX7exfGG3IAIeCtn_a4cWIFi9C8/VIDYwB_3ZGcq33mlzft1i1CQKUk3TwSS3OVcGOl1WtY)
Baby stroller 		Baby Items	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/JbX7wa-XCISxXJV8Gp9b5Q/emU49wj82Fd2WaDLE4nDbWS3UTyP8NKEojRtpHxnZ_3l-Tg-DnEelgoKzzyO-o1UV1CdwQZE9riG4KQvQIr-Fh8ji95gNGXDwh_WLtAjed_RDQFdH-6bnTkM1gGbD7O397C_5KV-cmDd1jCSZ7R0tw/uLzDhR48XoEuubaXWIbTLt6KhNHBp_ULXu33BFKyAaE)
Floor rug 		Rugs	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/4Tq6nCAH6XouN6gaEycfrw/vzRzRxPQ5XI5apcdqMv8MIaTG3SOr_0KEv16Jzf2qQO4do8ZG4EGzqF66k6xryw-41wBTRosH2cO9gSrnoiZZtVlEJRnDjYlNdF2SglfxRDMZppxqc9MiJcQOjdy_WPdXgqenb1D_pd-a7VY5w_Rdw/TbQTejUuYmkW7BYOfbv-Dp60_haR0XKh2RhZkUNybAc)
Wool blanket	Wool, warm blanket 	Linens	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/d94PSc5AH74ML9QwbyAu8w/WnmnVNcCdIIpEjAM5toOU9P6Q5QoFrKJXldYPSQCqk08sb35S0pF3AvssuLRHp0Y1MCUsA7goOSi-iXDG_b4V7zduoP2VGxY-okFc-nRisatkU4vROTJ9PxWLzlTMuFoe4OzmQZ1Y3E_yE40ORzPyA/lNy7qaGeEXDgqh-XOJ-kpUvWOxuWowJHv-ely5bS8_s),image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/UaYpBFdXJ904oGIjGU40Jw/3QL2igHJMic2xpU4hREH_hGit43S9BqnAkHrmLx71iHHTarDMKSo4b0p_IGAmezjt7Riq4MTp2vuKPqhZlFxiOVB8BClXqxbWt1CSFnRPJPRYKHmahXPAlkWl5_i6pLghM2G_lcXpOVPAfLG3XBx7g/TQeUkOv8nV7uqSblsDrLDcG_RHoBrKYnUy5hdYxebSs),image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/y6fziUoVlzlht7WveY088A/d633Tf03ne70Arco0yOwX-t5pGgAPsLrfcVjGsJ7Svrq9ILZNfPL_IEwzuVZuPLw7N5TdUMX8pe4YJLft8r8Kp4xkHdcmVisBC2A6Ts9gNszohRgb_OfoftMlony56FL4RdD2N5lhdSAMSLf4Sg67Q/OSIhAMTrGZ5jq7HCNwiI7R_6GBRM_NLnlZIfV3n6Nso)
Baby changing pad 		Baby Items	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/Ogb4AIGqTQCzWoHs8sKzRg/NI4lJ6qnmHM8Q7R2bHoWtE1Vgzo__UkLXxsW3Cnxbx44Mcae1rSRvSPe5kzLr1Pbc0N_h4b8SejtHQR83fcEH5pTMdVJ5XU-W_SpbVV6tGjKXo6pfCzetLz96HMAlDaSQu59WPt9RgkW5kNJqx7Vgw/3kbmPX-j3SvS53Rz4uLu1pTDvk5jCELTrgJ2xJabT9E)
Silk scarves 		Clothing	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/jh1HUuQjGgt60KIzgslGZw/_GQtUXpcCPFMqY43wcK77xSHgNGGnAffg6PUkCjkENE4C8Zg0ILTQg7XLbPIabA22BMe_SDmJtjiR51cLwOJsJn0cfFutC7XuvEghbw3oBHBRPrq32cUwnWgxrx92QwHl9ZQlwNloF_a1OL_zbQBPA/WiHJYO2YI_anfQbqMdkDKKGa9_89F4Z-t2gcbar2PzE)
End table	Wooden end table with magazine rack	Furniture	Used	PXL_20251203_195212291.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/STxX-wKqWQrefMU-Roy3Bg/-cDsSSxfVR8LWRfJfstvo58G7HIomkSRUFl7Yn9qKbNvXIp1e--i2lT06RuDmpQIRd14eKBJ2uGgN4-zi0mxUAmmBiDdS23rgI_H6tEbZyMpOJDGBcgxmBgqVikphUfUVyoQBC9UDRgGz_EijIHYtu1LPCKnb_H7E4RZ8YM3VxX4cbF_L-5ndNO_icBo2N03/eiZdBd6ZRj87ZOQyT0i5GuuvlqxQDxsE0qgbkVrNP64)
Area rugs	3 small area rugs	Rugs	Used	PXL_20251203_195751146.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/8MxJypK6QHxFD_G86bEouQ/TUx2v4zGd1qvt9sVMjLWVDJN5uUggVhgwpcvHARZO6waKE6WTzaZ32f5chHAw-m8NXnZtb1U7kyfrm0W_Um1hFYLRZnFy9GN4_7we8t1Fa-4I94acEVlWcLMji-HhPL1JBKqDY0hotEjEMRHMoTftjaMqakFE2HjoUj_j6qIOG4S9LtNBWsQSYdaRNWuMZgn/fS4qn6c4yvmkuzYkg2Ni5Fu7Heep7ko4RnJlMst13ss)
2 Sets of towels	Cotton bath towels, hand towels 	Linens	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/tH362DtFA4lXh13uPaMteg/w3o9p9cuXH9-pYSq2sS2IIxLmTIiGaGeEPxPBuahiyBGRF8yuBsay1WiHo5WZAUgCP-c79QacDZy7pLtq2DXLVkwYEwb5pDLpLGkkyVUyOMS_G8WiWQNsrEATVnqobP7WH2_FRaJuNnAxgiNGg7mWg/Nxd8LrbXDPPr3ZkHv140lKJUYZSlVCMdRAQf_fVJub0)
Baby potty	White Baby Jorn potty	Baby Items	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/xkpUlaXVxqs1hfhWI0Q_yg/SlQs-lb1wpsPBDezpBN4851wqYWGE85Zi3fDOS9Hk0B77tmZitT6Jwb3FNXycLugHIXqCtf3DOVsrjNZByqLI6-jyIK0BZThtoZZE6ZzFT0zSMVtu0xfV3cLbaISkgfNhJ5zVzhW8QdUplN3RhAUcQ/fxsmD0dGDyR5FqdMg-Ma5pd3XCOwo9O6u5FUxaJwdZg)
1 Full size sheets and pillow cases. 	Tan color 	Bedding	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/DktwSF-OUXnQPO4-3YiW5g/XHJIsy7vsCNuYo9B5A0oAVNOYvsq6zEF_iEM-FF6RTPKbvXqRsWPLi9cUOLGJm8po4SuHU1uznOCVzvGNnZbuzXP7AGds4CLUWeVFFt8E6A_Mpsub_er_qE53OcpvH7LtXbsftyRzgB8zAcxWQHrXA/H3mB_H3s6_rxGJk6dWaTcadMwzlXs32XdkcmOECRX0w)
1 twin bed set 	Mattress pad, sheets, pillow cases, bed spread 	Linens	Gently Used
Twin bed linen set 		Bedding	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/ZBg0wmVvuEaYHtI8cdk1PA/lrfQmD6UoKPTbJI4GdvCPBmAal8JnxF7yikNnfFAAZAOHqhgyP4f-b-2KAc9mEeNbdeOlTjnTLPVqNwVNKlfXZjGW1twzk50Hu9Y8uh18jjfaDHod3_13By-L0CPFWn_hH1AoM_NX0LjO3E3MmhA5w/0LDVZu-jsx_j9U91vIKFNdxFSD1cOmdZzTWXEfOUXUs)
2Table runners 	Red one blue one 	Linens	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/6QMz4kFV4Vj-6YMfpXywAA/-BhbX4HPzq6CoTJk_R1nYAn4UUUcnir12Iuth7y-K2ZATVHHSNhSo0mGCPMsnSIEPUHDSPWCQK9hIiOvDgWZI8f3_aul0FXeHUBmnzOLYwrkClOyyVcE_EOCHMSH39Gy6H9xa2TJZWyKOw_1ZCC3kw/B6Atj8xa73BlYE64i_XSaW0UZ9yiGVTHwwMUz11Dhoo)
Foot stool	Brown cloth covered foot stool 	Furniture	Used	PXL_20251203_201050705.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/9Z81pjSdDweBW9wJCsC_fA/NOjXmVvXefSeMxUv2wORFqjHHWBhp7OWnW2WQlhatN8vfug6Upx5Du-YxzqV5jrx7X913OueIzGKmvWUS3WrZnLyJEujgRJ86j-13ihEJLZ9ADmn0gBuItWwrXgPPpfPFuFl24kHIwf-3fmabxVBowyIHjUaQ_imAy4x0egTnpR8UVc7C2V3dF1OtqXXi-np/lCZWXpGJVcCn187kDqtxtw_XI68WWkpN8DF602Ihw58)
Floor lamp	Floor lamp with shade	Furniture	Used	PXL_20251208_112356745.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/83tDlQ2LWLMWxJPhnj3bgw/Ut1R-5LT6sUHAUqBYh5wTAy4FMPKWPVcGuFGyyzXcAOReS6e84YkfRUdtiG5WMSQGBAhtcqUpovK5c7RQCxkqdmCFh6rJqrW_5urAnahg1bwl-itUs2bI-WPxPp2b8RTvI5lp4V93UuN7CrSKFpq4Yqx64F3xXlWjxI1ND6KsNBlnwirPtUn1tVvvEKmOJD-/KpxeZ8J2oQntgQnkYnARpxYKvR45Y18c4P3jJBTH6hM),PXL_20251208_112308947.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/in8knKKxbAKeDwIsB6gzqw/HwQyr4-8uhyVrd-CUwv8lAwfxfCCpn0-Y8X3F0gIvvU6o8_-GK5ZLw6Ji19392SexIJzwG0XxkPHHdwgV4kk99ZiVMCoDk0mc7xhGItv9oN_I_xV5it656Pc_GkX8OtDyjvfryo6vaQHxHU14OF79FHOZbYYsV0GcfddN-kJkIUOEj_XfPIGrnLDFBugdz-5/CVBwUsNSkwn1glm4rq0LRFLENScyWB0SEnrzIlu7lWA)
Electric frying pan 	working condition	Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/Mvw6e8tchZYCh6-pt-cnBA/muqcxTaZL8JcG4k6qZhaXw2sFeiv1ju2DoZewJCcTGaaHWThxA8wnWcauwgowjV-ydWHt6gUCq5M6wwe1IH5PEPIY1uB2RpN6lnR0zpq3_20mZc805c9cYr06c9dYSB5vdApI5l7AI8WxmdGEyDawg/6Vu80gcSSBDPSMsKGToUctq9Dtzek84J26sT6A4lR0w)
Twin bed set	Complete with mattress pad and bed spread 	Bedding	Gently Used
Frying pans, set of 3	3 pas with 3 kids		Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/Peup8uZu8YMHguwRBXPJUw/TgJqsvvK0KWBSTvKARlEoq3vscKjHlyHd5M6v38-Cd0oSw-hGP3dSOkPbtNcFXJNGNkvkvIaLfgJMQeeXBbxGKVBVEDBtYl2cyRdwgdKJkWpPa9vPoClw8XLbaz7cVLvsSZetHTy3p09GKL_NMjU1w/y5zvkOX-zS73ynNCTuaB9Hnwnam-sdCsTHbk9cU7DIU)
Cat or small dog feeding trays		Other	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/v_s-kXlqZLSMfGryYWdmaA/rdIeinyPpZKUqU_1zPw5JgBk_mqnvxbKYkAzukAs7Fui9xNCj3ldeeyYnW34sFICi0spVs-VjmtUSqliwfoYtF0HNw0cILANBXMvfiGHJxugDXNe_tmoqZFCCnZV78XamT80Q5vycSk-JuNlHdmEuw/XNoAw22rEKJo4DvZxOHcWY_RMkOM2ZORaQVohfjo3Yo)
Air fryer 	Working condition 	Kitchenware	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/TgEMT9eQz5ucUHL0qOHhsA/pYsgFZHfKA_eirH39YVLVbJAXjX4HICxIIiQnG5cHdSPCZjskAIPrJKAb9JqQ85tYCWwl2sSNBhiTJEaw6U6qQabISe0FhrgosiS-neqfVTVB_uy_47srNHDlv5aaawjQbTuSBzMcn1nwSvaFM3hgA/7zxZ1IuR9Ij4ZYjyeNNBl7jk_LqAuaZ39W0JKbQKeCk),image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/4CoBiUTVaj-eydVSWkg2tw/yTmw-4JjXRASV-_gkCX8XgdKTh-P2nabFR-ayV_u4A89vqob6uXyW5fAIHP5_HDo6SJ14_lGixjta00c3GH7fzb7bPES3dNDxngcux9ZGYOCBaeapJQEOHXq1LErMKXMaaF1dinM-UfoN8T7YKPBMA/Xoj17aYQPSfFhwGSyct6aAvoNoVXjysKIih39Rw4ftc)
Toddlers clothing 		Clothing	Used
Electric tea cattle 		Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/vtQ42OyTUUCn6FCCZhWFBQ/8FyQWGDrOCsLXuJFdc7I5kYsLgX5nIoMTeu8DKJMsnwS-m4d-UpYaCcUawvqKBY9UKl32BTy_-NGEn-fLMNQYfa0eGpU6X7mATLzfhSH6iqo5qPrsvmx4yPSi2SVyizYpX4FSuEJmhfzlVXREUzcJA/6v896hUnTj4MKWlblcW7336NMd7F5RB2mMDn72-ZoiI)
Plates set	8 deep bowls, 7 salad and 3 small	Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/9zYe0XQOf0oOjZaZtkLViw/suP7keDqtdWeKm_KufLOJJTZwQ1WHiJN4FI84EtsEYPAiwcv6gBHPmslbngSAkzClXlJM3oQeWGqtamnUCXczqSR0oSKDIigOLwkDWLPAKGtGD_KY2qiJxwqwcRWPe1PyvtA05g17k-dBZp00AGXgQ/mtr9wuHvfhpgcxCJ9bnGfIjISoJvVBM6j_qn-mlORHc)
Diaper pail		Baby Items	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/qcXGV8AlJC-LC7AHM9YvyA/P8_0lH4luMA-gTlY9rAPlBlqjwixMjBAAyFZ_FUUw6pmbjVb-aidF3fWXNIRds4FnjsNpq9QBgBnSZCF6nDxiIPMFmLxxI6O8aWpwuKkQ7H2adXeJa8AR1NgZWStCwR1fF8C0mOJFeJonmjKo4a__g/pzDh34KUfiSEeEH2Ay9a3szYQWXkoBQs-cbIESA55EY)
Ceramic pitcher		Kitchenware	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/esFfZYI0eBWynUAdDJr9wA/fvOrZyrw6rFpTKaw9lgReQ3WPB6v5f11jHDGl-8cpjYTHCQWv4X2XyIEsr4da88TcnyvoBXLDm3DwmgDGGxecVzFQJd_UE8M5HmZoSHDKQcpWSN0xazj2_D-UAsS3erybGtnFqEp8kvj_keVg25XYQ/OlsFlLLrsfsvftYGpXMdjEhv9-Oie_8paexIvNcGObw)
Laundry basket	Black basket	Accessories		image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/LXxP6o0YU36U8Oe76DhWgA/nODaKcxrBpNPDK4L9O-A09Z7NdNFOyuwrnV4ycvX-tXiEMmgMevrfHLvwMUWI2pkDoWENbb5Vg0ypHCDCnrwyE2ewZeuTnxoNgVRIgjYLnR-DWCS1TS-HWMOfwnhucRwYiZC6bllYFrjyo4nZroPNg/P3qa5vSCWpH3Qm-1dY4u3wyjvcAG0_YfY4byu_AHh3U)
Variety size diapers 		Baby Items	New
Baking sheets 		Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/edYYUfZ24pHGVWCnrwS7YQ/VjSlVZjwliVBzkNlLPzVOJQ6sErUnjCjjdRKYsck31u84THOstlObM_5v3DOqiQt14_LjApMsExgK1pVvDvYZ8thDeuQwHDnU-IdAp4-LH8hX2OR9bVqfMtQBdKjXfxywoDvRC3RsqpmqLywja3kjA/9_79lAdfqcPAMBpMSoj8pX6rbiDopU7ecRcgAWswzuQ)
Crib side protector 		Baby Items	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/zYzsDR1NprQh41IlfV1gfg/iwBRoKnlGk4k8-2v1ToHymfTdKdi2LI8RpCPj9nwIkpeUj-dVkirhM1LfUtl2aNA-a5fdeN4GxbSeFDulx-9PDr7GZy1DqvYE3UwwqzUW4EatHIR3WwlfMnkCC5Cc6vO-1MP_tI12fY1KB6sXceRFg/5k3fDl5zhfN2icyj_yP5VLHNIvz5Ookx3plCr6hUJRM)
Small tea candle light		Furniture	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/Z1-2Itxq1hi8NGw2WBNHNg/UzmcEuZbSchxY3K7kqIq7MacbZPWhl4v9ybUpVT2vIZwfEJy6Mu3WQwlG9EuQQxEUxOO5K_sw3hbSu1zaoUl728dKr1R2uBxlkRHFAkkkAY0LqW5_4GT5_zAjI_qnC6qBY_Bylge-L6LlyOTzBIl3w/CNHNEmz5J3jhF2Q1En-axkEyBjUdE-pfO3FAuLvikfs)
Electric popcorn popper 		Electronics	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/SZHFhoVyJuJu3mKH4YmH2Q/bSr7RSrHAEX8p8kyR12weLdlVfWyamIirYpwX6B4SP-4Aya5tidX9_qlMAuy0BGfkbYnqS6vBNK7xDr3hSVFQF1R9YPXSrs7xP7SKkWCKo6uW2xeDlR6YP9Gd6VwtLoZu7Jcfq36W0-f7oJb-J0b7A/m75CYXYe8ljdj_AWOxZ0xFh7PllLbYPjwijoDjNg_r0)
Orange pitcher		Kitchenware	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/EEtoe3X-nFDeyEKI0FTz7w/S5W9hJIJTGLEomK2S_U6wyx_YJ88Sb7mgCvK8-pEwQAWJFZu5dh1eHlyLzIMSqoj5R1gE1XUGUrdREQ8zBh54cmx8OQ-PD10reOjE2G3Ij-XWRFByc0HbO8MSPl_qbiZWt-vfTQtnj65_Wc_9cjRbA/tAESDUeiSACfgCVWvib_OpHfR3vLq71go6beP_s-XMk)
Potty chair 		Baby Items	Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/OFjptOqt54HkohpqlWORPg/m5kuPPC4HLoUesMtJJI2Ze8q5eXR6BVr0MfXPqTeJ9CYSSF4ktA2kBWSUdZDzCCoLEugVbLSYUDvLbRv80tIE5SyNWfCAFrZ0F-fDtbKgkfXf0ZGocsD6w4UniMHn7-5X8wGMHjJYckw6LezB_IgUg/BvWiEovOEj4kVM6h0SNPOikkeNWD54d9bB6g0GISIdU)
Box of toys 		Toys	Gently Used
Baby changing pad		Bedding	Gently Used
3T child's clothing 		Clothing	Gently Used
10 Piece plate setting 		Kitchenware	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/_80dGuj7eRqu_O4H60oQiA/fvI2blY2kmDr0_A-oywmHHvRMJFVfM8WGaaapSsEBcJPDjUWSCuR2WnoZrvBJqOQQ8Ela981lso8NMtIagd7sA87EkKHP4f4yPjh7uY_xIzEWRxskvFNeCKewPk_8K-hT8C6Pj5mNm7QpmY06wJBQA/0OOVsde68y3sB4CRnkjUA4HmHYVqsV5J9cyxzE5Zzls)
Glass platters. 		Kitchenware	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/6GDmC4dKMwjIsw9vU9s_Qg/USsodVtqisF4hsNLpeSNFUESJLjth9HFuRAnLbMbG5ylg2qg_VKjEPJRqy89Pl5YyW3qhXA3gsZqNXsR_pFipd2vT_rTqaRh5-FoltuNG7aP9phS_vGAkcn7gCaxUwb3zREMBfl__kkCWL-kr0VCPg/OJ2_eisWgwZJeTDkQiehxToPs7pAyMu88nSuDdDHPRE)
 Nursing pillow		Baby Items	Gently Used	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/wuiVYc8USjDbQHw7ymtSGg/32ojmkyhsPrAdDzIINlssZYb54sR-AqipgqVT2fDAIIakU8rT8LTIhScxT2MujyrXV6TSLt3jI3-XnguuaTK9B3uEb-SAHHUjOVj98aTCVCI9VtqXYMyCwSTK3Nr-9HIxFZPOUTHlZazPhWOcovjZg/OnFNARqjm4dAZCoa2pBCGMumcSU3zK1nBv-jBeklSiE)
Night stand 		Furniture	Needs Repair	image.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/HgrzaZkp3q6PzQ1W0AeXpA/ge6b51cNXcIeXk1bFnD5RzqyGO2scHHf4svArB7gyWhS5y-apyTWdZ6oU_VPijLJLk13DwYI_ReXs5FELX7JLayNMAO4iPvUi7PKYEEExjkT3yXJeaBGqxfTeyST3Z1O7qoi1_dheaivfkj_NMc2Lw/rewwTNnPLoEaaGutFhTyajow2KXL7AsxIe6F2VNIBKA)
Chair	Maple chair with arms	Furniture	Used	PXL_20251208_203015960.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/xKZRBoTLb6uxHs1ns2qv6g/_g4_KPg7HhUBKnH0nTohAKVNpw0c22BAii4Q5-uSFszSjwl_0wMg17UqjWXWuR8WgAf59KgdYE49bKeDXuzG52YYlrTS7X4ODHPTmt7Ufdg_enuu6ENRPKeClV4HjJcTtOzLHXRY4gRf-_E6qRF4bOP_jrxbQHIT2aWIe0RjAAx69KvU1R1i7HgNRXc3U6gV/YmPhjklz94ZbwRQIGjNKtqhqT0Slm4rcxjMdmhLIf-I)
Mattress & box springs 	Full size mattress and box springs plus frame	Furniture	Used	PXL_20251208_194310042.MP.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/9g2T3s0f-ELGCiCUsBECVQ/bG_nvWzxLZchGDEvw2-Bgpyno9lDe8wJ8oqD1GYnD5XezCdskUQXpfmefO9uBsKL9Tf-fnrapVOBD-PQVsS3q5IMOLVqT78bjn65rrPJsdNzKHPqUSQDadz3ciM2pKmHPol3sjVThPS3U2LIluj7CikBpV5PQnr4rD1w8jqJMxySbv5r4jDf1jBOX-j-x1t-/OEfRHSpCtnRPAAnJIwFQDfmRAXJtGMk1Ky2HpCWnGls)
Bed	2 Twin size maple bed frames 	Furniture	Used	PXL_20251208_194813758.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/KdXKeYlrcHnYPsICCsVJBg/M66NcwPVF2ZCLo95F_td6iel8_uq5w9_HiyeQxeyOdZs3XN2320yE0p3yIAGD370YYtno3u0ZQa8ZcEShukJYnph6FwEQ36Wj8Vz8p0JJmJwKkk08OEdTL3XShRO8dtZ-nw_lSFq76RACPrjN3N2kVuex3GKUh5lXSeGuPbB8Gz_C-wF0oQm69_frFd7nTvl/80ZYGtXiKAcsyP3LBu70vrRmYz8demij0R8qWCWiHLU)
Card table with 2 chairs 	Folding card table with 2 folding chairs	Furniture	Used
Matress	Full size mattress, ok condition 	Furniture	Used	PXL_20251208_194915656.MP.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/CsyLdArF58M41woiCMX1Kg/mFFvwFunY9fgpKO6HS-9ZKSWfuFDZlSrFSoogUN0gpSgBQoBYDAnBQyCTe5MmDKgLoe16H6327rktPE9-CC9_MpIMDRuN8KSezL0zd3oVLhxiLv9nFTL4C-YXtQUMp3E3cyrTktiliUbhxOXDPNIN9tq1RUHmvu1yC7usXjZ5f9lwsLCslw5hhTsDiAFo-Iy/EbOBEf5qP3UU1PxUCcDV-ua_SbZvBaU68X0X288Rxr8)
Flatware 	Misc flatware in organizer	Kitchenware	Used	PXL_20251208_195359863.MP.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/dhmtmR-6oIzRXX3glOAuCA/WfrFvV6V6qPjryQgSUkdnQdiJsxutCRlvSamFPvhab3gXL7tPmAFSjlMaca8JKyPdSN1KJNyOI_0oMBt5N11eAiK-lZ1nEOdaZhle6x_1WCsvVgRgVM4YA75Zosq0hO1u8kjeX5BI0LTciz7XQTVTtMvjYpXEtGGMaD-euv2e3_RFEuNQ1oOBccUWtY9JgzG/q7zNQkJNCDKUdPAv8uCDTfEsfKia0mjcebDEJlOMBe8)
Wicker basket 	Large wicker basket 	Accessories 	Used	PXL_20251208_195920585.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/buG-Ok2zEIP4tYTJ0t0Zpg/W8JI0q5QVmiHbzMRwfArr7VfJtCxw-EOces82lqj-KyOfJfBUp7lGmIoKTv5D2UcGeV1VTTwp9FZ50oijYgItP6S5GDEnOr45Tf4vfVFGkEDHVLR34_GzGhBmX353Sf9W30a7_UuQU_svUH43aYmp7FQUziUqoQ0kuBbhyW9yDwl9FCtZRkm_E7V7PGwRoTL/5HL0EvPiuHtfQsglkSItfQxeSzBE3Fp6mI5u6zpWZHg)
Comforter 	Queen size comforter 	Bedding	Used	PXL_20251208_195224195.jpg (https://v5.airtableusercontent.com/v3/u/49/49/1767736800000/iHV2pvKiJ5Cb5ADY4KfQEA/mCRMTvf2oSahjp9NWZ046DLONCjkwOCeqQuPtNkvNkNaPil9jdXVyg7efFP1nd8EUtCagjHXUwo--5F0zwxUFUm3k_Ipxne7tWCrfxHR8ef6IDeatphrIiGNOwXQDEmtnhjTC5XmVBuKxg4pLa7mFy1G0bkDU5hbZe4OO2xP86Zp3ZxcTij8zXZRfIVE5iX9/g5GaBjNISAkOjRzq6vt9wIxaSAiBsZ4s6aapBtJYVTU)								`;

interface ParsedRecord {
  itemName: string;
  description?: string;
  category?: string;
  condition?: string;
  photos?: string[];
  dateDonated?: string;
  donor?: string;
  claimedStatus?: string;
  claimedBy?: string;
  numberOfClaims?: number;
  mostRecentClaimDate?: string;
  claimStatuses?: string;
  donorEmail?: string;
  donorName?: string;
  summaryForShopDisplay?: string;
  suggestedNextAction?: string;
  airtableId?: string;
}

function parsePhotos(photosStr: string): string[] {
  if (!photosStr || photosStr.trim() === '') return [];

  const urls: string[] = [];
  // Match URLs in parentheses: (https://...)
  const urlRegex = /\(([^)]+)\)/g;
  let match;

  while ((match = urlRegex.exec(photosStr)) !== null) {
    if (match[1].startsWith('http')) {
      urls.push(match[1]);
    }
  }

  return urls;
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

function parseTSV(data: string): ParsedRecord[] {
  const lines = data.trim().split('\n');
  const headers = lines[0].split('\t');
  const records: ParsedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const record: ParsedRecord = {
      itemName: '',
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      const headerKey = header.trim().toLowerCase().replace(/\s+/g, '');

      switch (headerKey) {
        case 'itemname':
          record.itemName = value;
          break;
        case 'description':
          record.description = value || undefined;
          break;
        case 'category':
          record.category = value || undefined;
          break;
        case 'condition':
          record.condition = value || undefined;
          break;
        case 'photos':
          record.photos = parsePhotos(value);
          break;
        case 'datedonated':
          record.dateDonated = parseDate(value);
          break;
        case 'donor':
          record.donor = value || undefined;
          break;
        case 'claimedstatus':
          record.claimedStatus = value || undefined;
          break;
        case 'claimedby':
          record.claimedBy = value || undefined;
          break;
        case 'numberofclaims':
          record.numberOfClaims = value ? parseInt(value, 10) : undefined;
          break;
        case 'mostrecentclaimdate':
          record.mostRecentClaimDate = parseDate(value);
          break;
        case 'claimstatuses':
          record.claimStatuses = value || undefined;
          break;
        case 'donoremail':
          record.donorEmail = value || undefined;
          break;
        case 'donorname':
          record.donorName = value || undefined;
          break;
        case 'summaryforshopdisplay':
          record.summaryForShopDisplay = value || undefined;
          break;
        case 'suggestednextaction':
          record.suggestedNextAction = value || undefined;
          break;
      }
    });

    // Generate a unique airtable_id based on item name and row number
    record.airtableId = `airtable_${i}_${record.itemName?.replace(/\s+/g, '_').toLowerCase().slice(0, 30)}`;

    if (record.itemName) {
      records.push(record);
    }
  }

  return records;
}

async function importDonations() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') || 'http://localhost:3000';
  const syncApiKey = process.env.SYNC_API_KEY;

  if (!syncApiKey) {
    console.error('SYNC_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Parsing Airtable data...');
  const records = parseTSV(AIRTABLE_DATA);
  console.log(`Found ${records.length} records to import`);

  // Filter out duplicates (the data was provided twice)
  const uniqueRecords = records.filter((record, index, self) =>
    index === self.findIndex((r) => r.itemName === record.itemName && r.description === record.description)
  );
  console.log(`After deduplication: ${uniqueRecords.length} unique records`);

  // Log a few sample records
  console.log('\nSample records:');
  uniqueRecords.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.itemName} (${r.category}) - ${r.photos?.length || 0} photos`);
  });

  // Use localhost for local development, or the actual API URL for production
  const apiUrl = 'http://localhost:3000/api/donations/import';

  console.log(`\nImporting to: ${apiUrl}`);
  console.log('Note: Set migratePhotos=true to also migrate photos to S3 (slower)');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': syncApiKey,
      },
      body: JSON.stringify({
        records: uniqueRecords,
        migratePhotos: false, // Set to true to migrate photos to S3
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('\nImport Results:');
    console.log(`  Total: ${result.results.total}`);
    console.log(`  Imported: ${result.results.imported}`);
    console.log(`  Failed: ${result.results.failed}`);
    console.log(`  Photos Imported: ${result.results.photosImported}`);

    if (result.results.errors.length > 0) {
      console.log('\nErrors:');
      result.results.errors.forEach((err: string) => console.log(`  - ${err}`));
    }
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importDonations();
