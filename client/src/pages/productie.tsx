import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const MAANDEN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

const ORI_DATA: Record<string, { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[]> = {
  "2024": [
    { maand: "Jan", ingediend: 312, verwerkt: 298, afgewezen: 14, doorlooptijd: 3.2 },
    { maand: "Feb", ingediend: 287, verwerkt: 275, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Mar", ingediend: 341, verwerkt: 330, afgewezen: 11, doorlooptijd: 2.8 },
    { maand: "Apr", ingediend: 298, verwerkt: 290, afgewezen: 8,  doorlooptijd: 2.9 },
    { maand: "Mei", ingediend: 375, verwerkt: 360, afgewezen: 15, doorlooptijd: 3.1 },
    { maand: "Jun", ingediend: 362, verwerkt: 350, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Jul", ingediend: 280, verwerkt: 268, afgewezen: 12, doorlooptijd: 3.4 },
    { maand: "Aug", ingediend: 255, verwerkt: 245, afgewezen: 10, doorlooptijd: 3.5 },
    { maand: "Sep", ingediend: 320, verwerkt: 310, afgewezen: 10, doorlooptijd: 3.1 },
    { maand: "Okt", ingediend: 348, verwerkt: 338, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Nov", ingediend: 330, verwerkt: 318, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Dec", ingediend: 290, verwerkt: 278, afgewezen: 12, doorlooptijd: 3.2 },
  ],
  "2025": [
    { maand: "Jan", ingediend: 325, verwerkt: 315, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Feb", ingediend: 295, verwerkt: 285, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Mar", ingediend: 358, verwerkt: 348, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Apr", ingediend: 310, verwerkt: 302, afgewezen: 8,  doorlooptijd: 2.7 },
    { maand: "Mei", ingediend: 388, verwerkt: 375, afgewezen: 13, doorlooptijd: 2.9 },
    { maand: "Jun", ingediend: 372, verwerkt: 362, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Jul", ingediend: 290, verwerkt: 280, afgewezen: 10, doorlooptijd: 3.2 },
    { maand: "Aug", ingediend: 268, verwerkt: 258, afgewezen: 10, doorlooptijd: 3.3 },
    { maand: "Sep", ingediend: 335, verwerkt: 325, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Okt", ingediend: 360, verwerkt: 350, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Nov", ingediend: 342, verwerkt: 330, afgewezen: 12, doorlooptijd: 2.8 },
    { maand: "Dec", ingediend: 305, verwerkt: 293, afgewezen: 12, doorlooptijd: 3.0 },
  ],
  "2026": [
    { maand: "Jan", ingediend: 338, verwerkt: 328, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Feb", ingediend: 302, verwerkt: 292, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Mar", ingediend: 365, verwerkt: 355, afgewezen: 10, doorlooptijd: 2.6 },
    { maand: "Apr", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Mei", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jun", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jul", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Aug", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Sep", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Okt", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Nov", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Dec", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
  ],
};

const KM_DATA: Record<string, { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[]> = {
  "2024": [
    { maand: "Jan", ingediend: 145, verwerkt: 138, afgewezen: 7,  doorlooptijd: 8.5 },
    { maand: "Feb", ingediend: 132, verwerkt: 125, afgewezen: 7,  doorlooptijd: 8.2 },
    { maand: "Mar", ingediend: 168, verwerkt: 160, afgewezen: 8,  doorlooptijd: 7.9 },
    { maand: "Apr", ingediend: 155, verwerkt: 148, afgewezen: 7,  doorlooptijd: 8.0 },
    { maand: "Mei", ingediend: 175, verwerkt: 166, afgewezen: 9,  doorlooptijd: 8.3 },
    { maand: "Jun", ingediend: 182, verwerkt: 173, afgewezen: 9,  doorlooptijd: 8.1 },
    { maand: "Jul", ingediend: 120, verwerkt: 114, afgewezen: 6,  doorlooptijd: 9.0 },
    { maand: "Aug", ingediend: 110, verwerkt: 104, afgewezen: 6,  doorlooptijd: 9.2 },
    { maand: "Sep", ingediend: 152, verwerkt: 145, afgewezen: 7,  doorlooptijd: 8.4 },
    { maand: "Okt", ingediend: 165, verwerkt: 157, afgewezen: 8,  doorlooptijd: 8.0 },
    { maand: "Nov", ingediend: 158, verwerkt: 150, afgewezen: 8,  doorlooptijd: 8.1 },
    { maand: "Dec", ingediend: 130, verwerkt: 122, afgewezen: 8,  doorlooptijd: 8.6 },
  ],
  "2025": [
    { maand: "Jan", ingediend: 152, verwerkt: 146, afgewezen: 6,  doorlooptijd: 8.1 },
    { maand: "Feb", ingediend: 138, verwerkt: 132, afgewezen: 6,  doorlooptijd: 7.9 },
    { maand: "Mar", ingediend: 175, verwerkt: 168, afgewezen: 7,  doorlooptijd: 7.6 },
    { maand: "Apr", ingediend: 162, verwerkt: 155, afgewezen: 7,  doorlooptijd: 7.7 },
    { maand: "Mei", ingediend: 182, verwerkt: 174, afgewezen: 8,  doorlooptijd: 7.9 },
    { maand: "Jun", ingediend: 190, verwerkt: 182, afgewezen: 8,  doorlooptijd: 7.8 },
    { maand: "Jul", ingediend: 128, verwerkt: 122, afgewezen: 6,  doorlooptijd: 8.6 },
    { maand: "Aug", ingediend: 118, verwerkt: 112, afgewezen: 6,  doorlooptijd: 8.8 },
    { maand: "Sep", ingediend: 160, verwerkt: 153, afgewezen: 7,  doorlooptijd: 8.0 },
    { maand: "Okt", ingediend: 172, verwerkt: 164, afgewezen: 8,  doorlooptijd: 7.7 },
    { maand: "Nov", ingediend: 165, verwerkt: 157, afgewezen: 8,  doorlooptijd: 7.8 },
    { maand: "Dec", ingediend: 136, verwerkt: 129, afgewezen: 7,  doorlooptijd: 8.2 },
  ],
  "2026": [
    { maand: "Jan", ingediend: 158, verwerkt: 152, afgewezen: 6,  doorlooptijd: 7.8 },
    { maand: "Feb", ingediend: 143, verwerkt: 137, afgewezen: 6,  doorlooptijd: 7.6 },
    { maand: "Mar", ingediend: 182, verwerkt: 175, afgewezen: 7,  doorlooptijd: 7.4 },
    { maand: "Apr", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Mei", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jun", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jul", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Aug", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Sep", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Okt", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Nov", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Dec", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
  ],
};

const JAREN = Array.from({ length: 30 }, (_, i) => String(1996 + i));
const LANDMETERS_JAREN = Array.from({ length: 31 }, (_, i) => String(1995 + i));

type KartografieRij = { jaar: string; binnengekomen: number; afgehandeld: number; gemiddeld: number; kartografen: number };
type LandmetersRij = { jaar: string; binnengekomen: number; afgehandeld: number; uitbesteding: number; gemiddeld: number; landmeters: number };

const KARTOGRAFIE_DATA: Record<string, KartografieRij[]> = {
  "Jan": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [60,66,88,11,88,52,102,66,53,54,35,101,98,73,118,57,82,74,51,51,51,51,80,44,65,74,58,129,117,158][i],
    afgehandeld:   [90,88,50,11,77,66,73,92,51,48,32,127,74,65,80,54,71,84,85,85,45,24,82,89,81,72,76,61,123,157][i],
    gemiddeld:     [300.0,176.0,100.0,27.5,192.5,220.0,243.3,460.0,170.0,240.0,160.0,635.0,370.0,325.0,400.0,270.0,355.0,420.0,425.0,425.0,225,120.0,410.0,445.0,405.0,360.0,380.0,305.0,615.0,785.0][i],
    kartografen:   [3,5,5,4,4,3,3,2,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2][i],
  })),
  "Feb": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [233,151,391,50,149,130,193,136,112,120,154,206,216,177,322,122,196,175,133,122,111,107,166,123,154,153,185,217,211,287][i],
    afgehandeld:   [129,198,189,50,108,145,177,143,104,107,115,197,173,187,275,119,124,146,178,160,115,99,150,188,144,101,116,136,231,300][i],
    gemiddeld:     [215.0,198.0,189.0,62.5,135.0,241.7,295.0,286.0,173.3,267.5,287.5,492.5,346.0,467.5,687.5,297.5,310.0,365.0,445.0,400.0,287.5,247.5,375.0,470.0,360.0,252.5,290.0,340.0,577.5,750.0][i],
    kartografen:   [6,10,10,8,8,6,6,5,6,4,4,4,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4][i],
  })),
  "Mrt": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [370,210,543,116,245,237,293,234,177,168,333,315,337,328,461,193,262,278,234,212,190,192,247,239,263,170,274,328,358,463][i],
    afgehandeld:   [237,240,544,116,220,225,261,256,190,134,235,359,306,338,437,183,185,255,280,262,212,212,274,277,272,156,361,310,439,458][i],
    gemiddeld:     [263.3,160.0,362.7,96.7,183.3,250.0,290.0,320.0,211.1,223.3,391.7,598.3,382.5,563.3,728.3,305.0,308.3,425.0,466.7,436.7,353.3,353.3,456.7,461.7,453.3,260.0,601.7,516.7,731.7,763.3][i],
    kartografen:   [9,15,15,12,12,9,9,8,9,6,6,6,8,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6][i],
  })),
  "Apr": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [512,258,685,153,300,326,363,234,177,309,333,494,501,415,542,270,365,359,308,286,261,298,368,239,263,239,498,502,536,620][i],
    afgehandeld:   [300,367,585,153,294,320,325,343,235,263,365,403,456,406,533,259,217,406,352,345,285,302,384,277,272,233,480,464,619,692][i],
    gemiddeld:     [250.0,183.5,292.5,95.6,183.8,266.7,270.8,285.8,213.6,292.2,456.3,503.8,456.0,507.5,666.3,323.8,271.3,507.5,440.0,431.3,356.3,377.5,480.0,346.3,340.0,291.3,600.0,580.0,773.8,865.0][i],
    kartografen:   [12,20,20,16,16,12,12,12,11,9,8,8,10,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8][i],
  })),
  "Mei": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [604,360,893,173,403,399,433,320,305,409,403,861,713,534,665,347,500,481,365,364,320,366,493,239,342,304,559,712,650,815][i],
    afgehandeld:   [412,553,761,173,407,396,394,403,338,357,464,592,643,518,636,323,299,474,445,428,356,372,522,277,322,295,547,607,786,782][i],
    gemiddeld:     [274.7,221.2,304.4,86.5,203.5,264.0,262.7,268.7,260.0,297.5,421.8,538.2,535.8,518.0,636.0,323.0,299.0,474.0,445.0,428.0,356.0,372.0,522.0,277.0,322.0,295.0,547.0,607.0,786.0,782.0][i],
    kartografen:   [15,25,25,20,20,15,15,15,13,12,11,11,12,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10][i],
  })),
  "Jun": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1010,450,951,391,493,486,540,423,389,520,503,1124,877,729,758,423,617,635,462,430,399,445,613,239,369,387,681,836,810,921][i],
    afgehandeld:   [460,690,844,391,484,485,451,503,448,437,561,979,749,670,723,397,452,559,561,502,459,501,654,277,533,449,694,885,862,990][i],
    gemiddeld:     [255.6,230.0,281.3,162.9,210.4,269.4,250.6,279.4,298.7,312.1,400.7,699.3,499.3,558.3,602.5,330.8,376.7,465.8,510.0,418.3,382.5,417.5,545.0,230.8,444.2,374.2,578.3,737.5,718.3,825.0][i],
    kartografen:   [18,30,30,24,23,18,18,18,15,14,14,14,15,12,12,12,12,12,11,12,12,12,12,12,12,12,12,12,12,12][i],
  })),
  "Jul": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1106,515,1035,481,563,598,596,493,449,576,620,1343,1128,825,913,483,704,786,562,510,477,559,727,239,611,529,794,957,957,1108][i],
    afgehandeld:   [535,835,1107,481,545,605,530,587,495,523,665,1275,904,830,896,488,638,687,632,613,540,613,747,277,693,577,849,1000,1037,1183][i],
    gemiddeld:     [254.8,238.6,316.3,171.8,209.6,288.1,265.0,279.5,291.2,326.9,415.6,750.0,502.2,592.9,597.3,348.6,455.7,490.7,486.2,437.9,385.7,437.9,533.6,197.9,495.0,412.1,606.4,714.3,740.7,845.0][i],
    kartografen:   [21,35,35,28,26,21,20,21,17,16,16,17,18,14,15,14,14,14,13,14,14,14,14,14,14,14,14,14,14,14][i],
  })),
  "Aug": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1205,589,1236,523,649,665,635,561,525,646,759,1550,1380,1052,1028,522,815,862,619,588,536,676,832,239,736,645,925,1029,1066,1247][i],
    afgehandeld:   [594,898,1295,523,625,668,556,659,566,616,811,1472,1185,1024,1044,565,735,870,725,696,611,730,884,277,811,708,989,1119,1131,1285][i],
    gemiddeld:     [237.6,224.5,323.8,163.4,223.2,278.3,252.7,274.6,297.9,324.2,426.8,736.0,564.3,640.0,614.1,353.1,459.4,543.8,483.3,435.0,381.9,456.3,552.5,173.1,506.9,442.5,618.1,699.4,706.9,803.1][i],
    kartografen:   [25,40,40,32,28,24,22,24,19,19,19,20,21,16,17,16,16,16,15,16,16,16,16,16,16,16,16,16,16,16][i],
  })),
  "Sep": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1313,728,1345,563,729,726,690,618,601,752,850,1721,1628,1185,1098,637,908,947,716,654,615,776,948,239,851,769,1018,1222,1169,1392][i],
    afgehandeld:   [664,1097,1483,563,711,718,583,732,667,700,888,1677,1301,1131,1169,679,810,936,841,770,714,822,991,277,926,813,1090,1460,1297,1453][i],
    gemiddeld:     [221.3,243.8,329.6,156.4,237.0,287.2,253.5,271.1,317.6,333.3,422.9,762.3,542.1,628.3,615.3,377.2,450.0,520.0,494.7,427.8,375.8,456.7,550.6,153.9,514.4,451.7,605.6,811.1,720.6,807.2][i],
    kartografen:   [30,45,45,36,30,25,23,27,21,21,21,22,24,18,19,18,18,18,17,18,19,18,18,18,18,18,18,18,18,18][i],
  })),
  "Okt": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1512,1022,1493,619,855,799,754,674,704,841,966,1894,1727,1292,1222,703,974,1044,816,734,693,776,1054,239,965,914,1177,1609,1288,1517][i],
    afgehandeld:   [770,1209,1690,619,782,798,616,765,730,787,1008,1776,1445,1370,1234,790,852,1077,912,881,795,822,1098,277,1072,939,1248,1671,1405,1593][i],
    gemiddeld:     [220.0,241.8,338.0,154.8,230.0,295.6,246.4,263.8,317.4,342.2,438.3,740.0,555.8,685.0,587.6,395.0,426.0,538.5,480.0,440.5,378.6,411.0,549.0,138.5,536.0,469.5,624.0,835.5,702.5,796.5][i],
    kartografen:   [35,50,50,40,34,27,25,29,23,23,23,24,26,20,21,20,20,20,19,20,21,20,20,20,20,20,20,20,20,20][i],
  })),
  "Nov": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1603,1119,1556,727,933,799,845,750,801,932,1095,2023,1838,1481,1426,803,1003,1202,877,841,763,776,1180,239,1117,1020,1311,1762,1419,1675][i],
    afgehandeld:   [905,1297,1781,727,884,798,672,833,837,873,1110,1931,1697,1540,1397,878,880,1206,974,958,879,822,1219,277,1292,1075,1386,1824,1508,1755][i],
    gemiddeld:     [226.3,235.8,323.8,165.2,238.9,257.4,258.5,268.7,334.8,349.2,444.0,715.2,606.1,700.0,607.4,399.1,400.0,548.2,463.8,435.5,382.2,373.6,554.1,125.9,587.3,488.6,630.0,829.1,685.5,797.7][i],
    kartografen:   [40,55,55,44,37,31,26,31,25,25,25,27,28,22,23,22,22,22,21,22,23,22,22,22,22,22,22,22,22,22][i],
  })),
  "Dec": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1647,1170,1600,780,933,799,932,750,864,1020,1218,2098,1949,1580,1481,837,2090,1255,950,932,835,776,1296,239,1339,1133,1459,1847,1504,1831][i],
    afgehandeld:   [937,1416,1789,780,884,798,736,833,941,975,1245,2174,1949,1639,1537,924,1871,1313,1000,1030,945,822,1278,277,1406,1171,1601,1890,1647,1861][i],
    gemiddeld:     [208.2,236.0,298.2,162.5,215.6,228.0,262.9,245.0,348.5,187.5,461.1,724.7,649.7,682.9,614.8,385.0,779.6,547.1,454.5,429.2,378.0,342.5,532.5,115.4,585.8,487.9,667.1,787.5,686.3,775.4][i],
    kartografen:   [45,60,60,48,41,35,28,34,27,52,27,30,30,24,25,24,24,24,22,24,25,24,24,24,24,24,24,24,24,24][i],
  })),
};

const PERIODES: { label: string; range: [number, number] }[] = [
  { label: "Alle jaren (1996–2025)", range: [0, 30] },
  { label: "1996–2005", range: [0, 10] },
  { label: "2006–2015", range: [10, 20] },
  { label: "2016–2025", range: [20, 30] },
];

const LANDMETERS_DATA: Record<string, LandmetersRij[]> = {
  "Jan": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [302,60,66,88,43,60,96,124,32,82,63,102,102,89,90,45,53,73,45,114,92,91,82,71,114,99,54,258,164,191,248][i],
    afgehandeld:   [102,102,48,150,64,88,52,102,72,53,54,35,101,98,73,118,57,82,74,82,71,60,56,86,79,89,79,127,88,94,129][i],
    uitbesteding:  [28,53,6,113,18,22,5,4,0,4,0,0,3,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [113.3,102.0,53.3,187.5,80.0,146.7,86.7,170.0,144.0,132.5,180.0,87.5,168.3,163.3,121.7,196.7,95.0,164.0,148.0,136.7,118.3,100.0,93.3,143.3,131.7,148.3,131.7,211.7,146.7,134.3,184.3][i],
    landmeters:    [9,10,9,8,8,6,6,6,5,4,3,4,6,6,6,6,6,5,5,6,6,6,6,6,6,6,6,6,6,7,7][i],
  })),
  "Feb": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [388,233,151,391,83,117,168,193,84,195,127,181,289,291,194,182,131,149,146,239,162,167,181,218,192,241,142,366,501,281,326][i],
    afgehandeld:   [230,337,154,243,116,149,130,192,142,112,120,154,206,216,178,322,122,196,148,183,161,139,141,167,195,198,96,216,199,241,305][i],
    uitbesteding:  [79,179,46,168,19,23,12,9,0,7,1,3,5,7,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [127.8,168.5,96.3,151.9,72.5,124.2,108.3,160.0,142.0,160.0,200.0,171.1,171.7,180.0,148.3,268.3,110.9,196.0,148.0,152.5,134.2,115.8,117.5,139.2,162.5,165.0,80.0,180.0,165.8,172.1,217.9][i],
    landmeters:    [18,20,16,16,16,12,12,12,10,7,6,9,12,12,12,12,11,10,10,12,12,12,12,12,12,12,12,12,12,14,14][i],
  })),
};

function LandmetersTab() {
  const [maand, setMaand] = useState("Feb");
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const allePeriodes: { label: string; range: [number, number] }[] = [
    { label: "Alle jaren (1995–2025)", range: [0, 31] },
    { label: "1995–2004", range: [0, 10] },
    { label: "2005–2014", range: [10, 20] },
    { label: "2015–2025", range: [20, 31] },
  ];

  const periode = allePeriodes[periodeIdx];
  const volledigeData = LANDMETERS_DATA[maand] || [];
  const data = volledigeData.slice(periode.range[0], periode.range[1]);

  const totBinnengekomen = data.reduce((s, d) => s + d.binnengekomen, 0);
  const totAfgehandeld   = data.reduce((s, d) => s + d.afgehandeld, 0);
  const totUitbesteding  = data.reduce((s, d) => s + d.uitbesteding, 0);
  const gemLandmeters    = data.length ? (data.reduce((s, d) => s + d.landmeters, 0) / data.length) : 0;
  const maxGemiddeld     = data.length ? Math.max(...data.map(d => d.gemiddeld)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={maand} onValueChange={setMaand}>
            <SelectTrigger className="w-28" data-testid="select-maand-landmeters">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(LANDMETERS_DATA).map(m => (
                <SelectItem key={m} value={m} data-testid={`option-lm-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52" data-testid="select-periode-landmeters">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allePeriodes.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-lm-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal binnengekomen</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totBinnengekomen.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal afgehandeld</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totAfgehandeld.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Exercitie uitbesteding</p>
            <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{totUitbesteding.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Hoogste gem./landmeter</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{maxGemiddeld > 0 ? maxGemiddeld.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">tienvoud, in periode</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Binnengekomen, Afgehandeld & Uitbesteding per jaar (t/m {maand})</CardTitle>
          <CardDescription className="text-xs">Staafdiagram — gecombineerd met gem. productie per landmeter (tienvoud, rechteras)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 44 + 80 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 60, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(val: number, name: string) => [
                      name === "Gem./landmeter (×10)" ? val.toFixed(1) : val.toLocaleString("nl"),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="binnengekomen" name="Binnengekomen"      fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="afgehandeld"   name="Afgehandeld"        fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="uitbesteding"  name="Exercitie uitbest." fill="#f97316" radius={[3,3,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="gemiddeld" name="Gem./landmeter (×10)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aantal landmeters per jaar</CardTitle>
          <CardDescription className="text-xs">Gem. over geselecteerde periode: {gemLandmeters.toFixed(1)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 44 + 80 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val: number) => [val, "Landmeters"]} />
                  <Bar dataKey="landmeters" name="Landmeters" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maand} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jaar</TableHead>
                <TableHead className="text-right">Binnengekomen</TableHead>
                <TableHead className="text-right">Afgehandeld</TableHead>
                <TableHead className="text-right">Uitbesteding</TableHead>
                <TableHead className="text-right">Verschil</TableHead>
                <TableHead className="text-right">Gem./landmeter (×10)</TableHead>
                <TableHead className="text-right">Landmeters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const verschil = row.afgehandeld - row.binnengekomen;
                return (
                  <TableRow key={row.jaar} data-testid={`row-landmeters-${maand}-${row.jaar}`}>
                    <TableCell className="font-semibold">{row.jaar}</TableCell>
                    <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{row.binnengekomen}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{row.afgehandeld}</TableCell>
                    <TableCell className="text-right text-orange-500 dark:text-orange-400">{row.uitbesteding}</TableCell>
                    <TableCell className="text-right">
                      <span className={verschil > 0 ? "text-green-600 dark:text-green-400" : verschil < 0 ? "text-red-500" : "text-muted-foreground"}>
                        {verschil > 0 ? "+" : ""}{verschil}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">{row.gemiddeld.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.landmeters}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Totaal/Gem.</TableCell>
                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{totBinnengekomen}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{totAfgehandeld}</TableCell>
                <TableCell className="text-right text-orange-500 dark:text-orange-400">{totUitbesteding}</TableCell>
                <TableCell className="text-right">
                  <span className={totAfgehandeld - totBinnengekomen >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {totAfgehandeld - totBinnengekomen >= 0 ? "+" : ""}{totAfgehandeld - totBinnengekomen}
                  </span>
                </TableCell>
                <TableCell className="text-right text-amber-600 dark:text-amber-400">
                  {data.length ? (data.reduce((s, d) => s + d.gemiddeld, 0) / data.length).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">{gemLandmeters.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KartografieTab() {
  const [maand, setMaand] = useState("Feb");
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const periode = PERIODES[periodeIdx];
  const volledigeData = KARTOGRAFIE_DATA[maand] || [];
  const data = volledigeData.slice(periode.range[0], periode.range[1]);

  const totBinnengekomen = data.reduce((s, d) => s + d.binnengekomen, 0);
  const totAfgehandeld   = data.reduce((s, d) => s + d.afgehandeld, 0);
  const gemKartografen   = data.length ? (data.reduce((s, d) => s + d.kartografen, 0) / data.length) : 0;
  const maxGemiddeld     = Math.max(...data.map(d => d.gemiddeld));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={maand} onValueChange={setMaand}>
            <SelectTrigger className="w-28" data-testid="select-maand-kartografie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(KARTOGRAFIE_DATA).map(m => (
                <SelectItem key={m} value={m} data-testid={`option-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52" data-testid="select-periode-kartografie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODES.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal binnengekomen</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totBinnengekomen.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal afgehandeld</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totAfgehandeld.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Gem. kartografen</p>
            <p className="text-2xl font-bold">{gemKartografen.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">gemiddeld in periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Hoogste gem./kartograaf</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{maxGemiddeld.toLocaleString("nl", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground mt-1">tienvoud, in periode</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Binnengekomen vs. Afgehandeld per jaar (t/m {maand})</CardTitle>
          <CardDescription className="text-xs">Staafdiagram — gecombineerd met gem. productie per kartograaf (tienvoud, rechteras)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 38 + 80 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 60, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(val: number, name: string) => [
                      name === "Gem./kartograaf (×10)" ? val.toFixed(1) : val.toLocaleString("nl"),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="binnengekomen" name="Binnengekomen" fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="afgehandeld"   name="Afgehandeld"   fill="#22c55e" radius={[3,3,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="gemiddeld" name="Gem./kartograaf (×10)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aantal kartografen per jaar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 38 + 80 }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val: number) => [val, "Kartografen"]} />
                  <Bar dataKey="kartografen" name="Kartografen" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maand} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jaar</TableHead>
                <TableHead className="text-right">Binnengekomen</TableHead>
                <TableHead className="text-right">Afgehandeld</TableHead>
                <TableHead className="text-right">Verschil</TableHead>
                <TableHead className="text-right">Gem./kartograaf (×10)</TableHead>
                <TableHead className="text-right">Kartografen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const verschil = row.afgehandeld - row.binnengekomen;
                return (
                  <TableRow key={row.jaar} data-testid={`row-kartografie-${maand}-${row.jaar}`}>
                    <TableCell className="font-semibold">{row.jaar}</TableCell>
                    <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{row.binnengekomen}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{row.afgehandeld}</TableCell>
                    <TableCell className="text-right">
                      <span className={verschil > 0 ? "text-green-600 dark:text-green-400" : verschil < 0 ? "text-red-500" : "text-muted-foreground"}>
                        {verschil > 0 ? "+" : ""}{verschil}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">{row.gemiddeld.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.kartografen}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Totaal/Gem.</TableCell>
                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{totBinnengekomen}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{totAfgehandeld}</TableCell>
                <TableCell className="text-right">
                  <span className={totAfgehandeld - totBinnengekomen >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {totAfgehandeld - totBinnengekomen >= 0 ? "+" : ""}{totAfgehandeld - totBinnengekomen}
                  </span>
                </TableCell>
                <TableCell className="text-right text-amber-600 dark:text-amber-400">
                  {data.length ? (data.reduce((s, d) => s + d.gemiddeld, 0) / data.length).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">{gemKartografen.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function sumField(data: { ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[], field: "ingediend" | "verwerkt" | "afgewezen") {
  return data.filter(d => d[field] > 0).reduce((s, d) => s + d[field], 0);
}

function avgField(data: { doorlooptijd: number }[]) {
  const actief = data.filter(d => d.doorlooptijd > 0);
  if (!actief.length) return 0;
  return actief.reduce((s, d) => s + d.doorlooptijd, 0) / actief.length;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (!previous || !current) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium"><TrendingUp className="h-3 w-3" />+{pct.toFixed(1)}%</span>;
  if (pct < 0) return <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium"><TrendingDown className="h-3 w-3" />{pct.toFixed(1)}%</span>;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function DepartmentTab({ data, prevData, label }: {
  data: { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[];
  prevData: { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[];
  label: string;
}) {
  const activeData = data.filter(d => d.ingediend > 0);
  const totIngediend = sumField(data, "ingediend");
  const totVerwerkt = sumField(data, "verwerkt");
  const totAfgewezen = sumField(data, "afgewezen");
  const gemDoorloop = avgField(data);
  const prevIngediend = sumField(prevData, "ingediend");
  const prevVerwerkt = sumField(prevData, "verwerkt");
  const prevDoorloop = avgField(prevData);
  const verwerkingsgraad = totIngediend > 0 ? Math.round((totVerwerkt / totIngediend) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid={`card-ingediend-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Totaal ingediend</p>
                <p className="text-2xl font-bold">{totIngediend.toLocaleString("nl")}</p>
              </div>
              <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={totIngediend} previous={prevIngediend} /></div>
          </CardContent>
        </Card>
        <Card data-testid={`card-verwerkt-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Verwerkt</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totVerwerkt.toLocaleString("nl")}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={totVerwerkt} previous={prevVerwerkt} /></div>
          </CardContent>
        </Card>
        <Card data-testid={`card-afgewezen-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Afgewezen</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{totAfgewezen.toLocaleString("nl")}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            </div>
            <div className="mt-2">
              <Badge variant={verwerkingsgraad >= 95 ? "default" : verwerkingsgraad >= 88 ? "outline" : "destructive"} className="text-xs">
                {verwerkingsgraad}% verwerkt
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card data-testid={`card-doorlooptijd-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Gem. doorlooptijd</p>
                <p className="text-2xl font-bold">{gemDoorloop > 0 ? gemDoorloop.toFixed(1) : "—"} <span className="text-base font-normal text-muted-foreground">dgn</span></p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={-gemDoorloop} previous={-prevDoorloop} /></div>
          </CardContent>
        </Card>
      </div>

      {activeData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ingediend vs. Verwerkt per maand</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(val: number, name: string) => [val.toLocaleString("nl"), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ingediend" name="Ingediend" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="verwerkt" name="Verwerkt" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="afgewezen" name="Afgewezen" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Doorlooptijd (werkdagen)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={activeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(val: number) => [`${val.toFixed(1)} dgn`, "Doorlooptijd"]}
                    />
                    <Line type="monotone" dataKey="doorlooptijd" name="Doorlooptijd" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maandoverzicht</CardTitle>
              <CardDescription className="text-xs">Gedetailleerde productiecijfers per maand</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maand</TableHead>
                    <TableHead className="text-right">Ingediend</TableHead>
                    <TableHead className="text-right">Verwerkt</TableHead>
                    <TableHead className="text-right">Afgewezen</TableHead>
                    <TableHead className="text-right">% Verwerkt</TableHead>
                    <TableHead className="text-right">Doorlooptijd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeData.map((row) => {
                    const pct = row.ingediend > 0 ? Math.round((row.verwerkt / row.ingediend) * 100) : 0;
                    return (
                      <TableRow key={row.maand} data-testid={`row-productie-${label}-${row.maand}`}>
                        <TableCell className="font-medium">{row.maand}</TableCell>
                        <TableCell className="text-right">{row.ingediend.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">{row.verwerkt.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right text-red-500 dark:text-red-400">{row.afgewezen.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pct >= 95 ? "default" : pct >= 88 ? "outline" : "destructive"} className="text-xs">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.doorlooptijd.toFixed(1)} dgn</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Totaal / Gem.</TableCell>
                    <TableCell className="text-right">{totIngediend.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{totVerwerkt.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right text-red-500 dark:text-red-400">{totAfgewezen.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={verwerkingsgraad >= 95 ? "default" : verwerkingsgraad >= 88 ? "outline" : "destructive"} className="text-xs">
                        {verwerkingsgraad}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{gemDoorloop.toFixed(1)} dgn</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Geen productiedata beschikbaar voor dit jaar.</p>
            <p className="text-xs text-muted-foreground">Selecteer een ander jaar of voeg productiecijfers toe.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ProductiePage() {
  const currentYear = new Date().getFullYear().toString();
  const [jaar, setJaar] = useState(currentYear);
  const prevJaar = (parseInt(jaar) - 1).toString();

  const { data: productieFoto } = useQuery<{ value: string | null }>({
    queryKey: ["/api/site-settings", "productie_photo"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/productie_photo", { credentials: "include" });
      if (!res.ok) return { value: null };
      return res.json();
    },
  });

  const jaarOpties = ["2024", "2025", "2026"];

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Productie"
        subtitle="Productiecijfers en grafieken per afdeling"
        imageSrc={productieFoto?.value || "/uploads/App_pics/rapporten.png"}
        imageAlt="productie"
      />
      <div className="p-6 space-y-5">
        <Tabs defaultValue="ori">
          <TabsList className="mb-5 flex-wrap h-auto gap-1">
            <TabsTrigger value="ori" data-testid="tab-ori">
              Openbare Registers en Informatie
            </TabsTrigger>
            <TabsTrigger value="km" data-testid="tab-km">
              Kadastrale Metingen
            </TabsTrigger>
            <TabsTrigger value="kartografie" data-testid="tab-kartografie">
              Kartografie
            </TabsTrigger>
            <TabsTrigger value="landmeters" data-testid="tab-landmeters">
              Landmeters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ori">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-muted-foreground">Jaar:</span>
              <Select value={jaar} onValueChange={setJaar}>
                <SelectTrigger className="w-32" data-testid="select-jaar-ori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jaarOpties.map(j => (
                    <SelectItem key={j} value={j} data-testid={`option-jaar-${j}`}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DepartmentTab
              data={ORI_DATA[jaar] || []}
              prevData={ORI_DATA[prevJaar] || []}
              label="ORI"
            />
          </TabsContent>

          <TabsContent value="km">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-muted-foreground">Jaar:</span>
              <Select value={jaar} onValueChange={setJaar}>
                <SelectTrigger className="w-32" data-testid="select-jaar-km">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jaarOpties.map(j => (
                    <SelectItem key={j} value={j} data-testid={`option-jaar-km-${j}`}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DepartmentTab
              data={KM_DATA[jaar] || []}
              prevData={KM_DATA[prevJaar] || []}
              label="KM"
            />
          </TabsContent>

          <TabsContent value="kartografie">
            <KartografieTab />
          </TabsContent>

          <TabsContent value="landmeters">
            <LandmetersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
